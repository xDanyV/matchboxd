import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.FOOTBALL_API_KEY;

async function main() {
    if (!API_KEY) {
        console.error('❌ Error: No se encontró FOOTBALL_API_KEY en tu archivo .env');
        process.exit(1);
    }

    console.log('🧹 Limpiando base de datos previa...');
    await prisma.reviewLike.deleteMany();
    await prisma.review.deleteMany();
    await prisma.mvpVote.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.match.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.competition.deleteMany();

    console.log('🏆 Creando competición: UEFA Champions League...');
    const competition = await prisma.competition.upsert({
        where: { slug: 'uefa-champions-league' },
        update: {
            name: 'UEFA Champions League',
            type: 'CLUB',
            logoUrl: 'https://media.api-sports.io/football/leagues/2.png',
        },
        create: {
            name: 'UEFA Champions League',
            slug: 'uefa-champions-league',
            type: 'CLUB',
            logoUrl: 'https://media.api-sports.io/football/leagues/2.png',
        },
    });

    const seasonsToFetch = [2023, 2024];

    for (const seasonYear of seasonsToFetch) {
        const formattedSeasonLabel = `${seasonYear}-${seasonYear + 1}`;
        console.log(`\n⚽ Consultando partidos de la temporada ${formattedSeasonLabel}...`);

        try {
            const response = await fetch(
                `https://v3.football.api-sports.io/fixtures?league=2&season=${seasonYear}`,
                {
                    headers: {
                        'x-apisports-key': API_KEY,
                    },
                }
            );

            const data = await response.json();
            const fixtures = data.response || [];

            console.log(`📌 Total devueltos por API (${seasonYear}): ${fixtures.length}`);

            // Filtrar para ignorar rondas preliminares y tomar fases importantes (Group Stage, Octavos, Cuartos, Semi, Final)
            const mainStageFixtures = fixtures.filter((item: any) => {
                const round = item.league.round || '';
                return (
                    round.includes('Group') ||
                    round.includes('Round of 16') ||
                    round.includes('Quarter-finals') ||
                    round.includes('Semi-finals') ||
                    round.includes('Final')
                );
            });

            // Si no hay filtro aplicable (ej. torneo nuevo), tomar los últimos del arreglo (que son los más recientes)
            const selectedFixtures = (
                mainStageFixtures.length > 0 ? mainStageFixtures : fixtures.slice(-10)
            ).slice(0, 8);

            for (const item of selectedFixtures) {
                const { fixture, teams, goals, league } = item;

                const homeSlug = teams.home.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const homeTeam = await prisma.team.upsert({
                    where: { slug: homeSlug },
                    update: {
                        name: teams.home.name,
                        crestUrl: teams.home.logo,
                    },
                    create: {
                        name: teams.home.name,
                        slug: homeSlug,
                        crestUrl: teams.home.logo,
                    },
                });

                const awaySlug = teams.away.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const awayTeam = await prisma.team.upsert({
                    where: { slug: awaySlug },
                    update: {
                        name: teams.away.name,
                        crestUrl: teams.away.logo,
                    },
                    create: {
                        name: teams.away.name,
                        slug: awaySlug,
                        crestUrl: teams.away.logo,
                    },
                });

                await prisma.match.create({
                    data: {
                        date: new Date(fixture.date),
                        homeTeamId: homeTeam.id,
                        awayTeamId: awayTeam.id,
                        homeScore: goals.home ?? 0,
                        awayScore: goals.away ?? 0,
                        competitionId: competition.id,
                        stadium: fixture.venue?.name || 'Estadio Principal',
                        stage: league.round,
                        season: formattedSeasonLabel,
                        isIconic: true,
                        tags: ['UEFA Champions League', league.round, formattedSeasonLabel],
                        summary: `Encuentro de ${league.round} entre ${teams.home.name} y ${teams.away.name} (${formattedSeasonLabel}).`,
                    },
                });

                console.log(`  └─ Registrado: ${teams.home.name} ${goals.home ?? 0} - ${goals.away ?? 0} ${teams.away.name} (${league.round})`);

                await fetchAndSaveSquad(teams.home.id, homeTeam.id);
                await fetchAndSaveSquad(teams.away.id, awayTeam.id);
            }
        } catch (error) {
            console.error(`❌ Error al consultar temporada ${seasonYear}:`, error);
        }
    }

    console.log('\n🎉 ¡Proceso de siembra completado con éxito!');
}

async function fetchAndSaveSquad(apiTeamId: number, dbTeamId: string) {
    try {
        const res = await fetch(`https://v3.football.api-sports.io/players/squads?team=${apiTeamId}`, {
            headers: {
                'x-apisports-key': API_KEY!,
            },
        });

        const squadData = await res.json();
        const players = squadData.response?.[0]?.players || [];

        for (const p of players) {
            await prisma.player.upsert({
                where: { id: `api-player-${p.id}` },
                update: {
                    name: p.name,
                    photoUrl: p.photo,
                    position: p.position,
                    teamId: dbTeamId,
                },
                create: {
                    id: `api-player-${p.id}`,
                    name: p.name,
                    photoUrl: p.photo,
                    position: p.position,
                    teamId: dbTeamId,
                },
            });
        }
    } catch (err) {
        console.error(`  ⚠️ No se pudieron obtener jugadores para la ID ${apiTeamId}:`, err);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });