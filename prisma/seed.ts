import { PrismaClient } from '@prisma/client';

/**
 * Seed SEGURO: solo crea o actualiza datos (upsert). NUNCA borra reseñas, likes,
 * votos de MVP, watchlist, partidos, equipos ni jugadores, y se puede repetir.
 *
 * Uso:
 *   npm run seed              -> partidos, detalles de equipos y plantillas que falten
 *   npm run seed -- --squads  -> además refresca las plantillas de TODOS los equipos
 *
 * Después, para la línea de tiempo de los partidos: npm run sync:events
 */

const prisma = new PrismaClient();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 2; // UEFA Champions League
const SEASONS = [2023, 2024];
// Fase de grupos (2023-24) o fase de liga (2024-25): cuántos partidos guardar por temporada.
// Son los primeros que devuelve la API. Pon 0 para no guardar ninguno.
const GROUP_MATCHES_PER_SEASON = 8;
const REQUEST_DELAY_MS = 7000; // pausa entre peticiones (límite por minuto del plan gratis)
const RATE_LIMIT_WAIT_MS = 65_000;
const MAX_RATE_LIMIT_RETRIES = 2;
// Se guardan TODOS los partidos de estas rondas (octavos en adelante). Para incluir también
// los play-offs de eliminatoria de 2024-25, agrega |Knockout Round Play-offs a la expresión.
const KNOCKOUT_STAGE = /Round of 16|Quarter-finals|Semi-finals|^Final$/;
const LEAGUE_STAGE = /Group|League Stage|League Phase/;

const REFRESH_ALL_SQUADS = process.argv.includes('--squads');

interface ApiTeamRef {
    id: number;
    name: string;
    logo: string | null;
}

interface ApiFixture {
    fixture: { id: number; date: string; venue?: { name?: string | null } | null };
    league: { round?: string | null };
    teams: { home: ApiTeamRef; away: ApiTeamRef };
    goals: { home: number | null; away: number | null };
}

interface ApiTeamInfo {
    team: {
        id: number;
        name?: string | null;
        country?: string | null;
        founded?: number | null;
        logo?: string | null;
    };
    venue?: {
        name?: string | null;
        city?: string | null;
        capacity?: number | null;
        image?: string | null;
    } | null;
}

interface ApiSquad {
    players: {
        id: number;
        name: string;
        number?: number | null;
        position?: string | null;
        photo?: string | null;
    }[];
}

/** Se agotó la cuota diaria de la API: no tiene sentido seguir pidiendo datos. */
class QuotaError extends Error { }

const quota: { day: string | null; minute: string | null } = { day: null, minute: null };
const stats = { matchesCreated: 0, matchesUpdated: 0 };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Pide datos a la API y NUNCA ignora sus errores en silencio (límite por minuto,
 * cuota diaria, plan, parámetros). Reintenta si es el límite por minuto.
 */
async function apiGet<T>(path: string, attempt = 0): Promise<T[]> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'x-apisports-key': API_KEY! },
    });

    // Si la API no envía estas cabeceras, simplemente no se muestran
    quota.day = res.headers.get('x-ratelimit-requests-remaining');
    quota.minute = res.headers.get('x-ratelimit-remaining');

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} en ${path}`);
    }

    const data = await res.json();
    const errors: unknown = data.errors;
    const errorKeys = errors && typeof errors === 'object' ? Object.keys(errors) : [];

    if (errorKeys.length > 0) {
        if (errorKeys.includes('rateLimit') && attempt < MAX_RATE_LIMIT_RETRIES) {
            console.warn(
                `  ⏳ Límite por minuto alcanzado. Esperando ${RATE_LIMIT_WAIT_MS / 1000}s para reintentar...`
            );
            await sleep(RATE_LIMIT_WAIT_MS);
            return apiGet<T>(path, attempt + 1);
        }

        if (errorKeys.includes('requests')) {
            throw new QuotaError(`Cuota diaria de la API agotada: ${JSON.stringify(errors)}`);
        }

        throw new Error(`La API devolvió errores en ${path}: ${JSON.stringify(errors)}`);
    }

    return (data.response ?? []) as T[];
}

/**
 * Crea o actualiza un equipo. Los datos opcionales (país, estadio...) solo se escriben
 * si la API los trae: un dato que falte NUNCA borra el que ya tenías.
 */
async function upsertTeam(ref: ApiTeamRef, info: ApiTeamInfo | undefined) {
    const slug = slugify(ref.name);
    const team = info?.team;
    const venue = info?.venue;

    const details = {
        name: team?.name || ref.name,
        apiId: ref.id,
        crestUrl: team?.logo || ref.logo || undefined,
        ...(team?.country ? { country: team.country } : {}),
        ...(team?.founded ? { founded: team.founded } : {}),
        ...(venue?.name ? { venueName: venue.name } : {}),
        ...(venue?.city ? { venueCity: venue.city } : {}),
        ...(venue?.capacity ? { venueCapacity: venue.capacity } : {}),
        ...(venue?.image ? { venueImageUrl: venue.image } : {}),
    };

    const existing = await prisma.team.findFirst({
        where: { OR: [{ apiId: ref.id }, { slug }] },
        select: { id: true },
    });

    if (existing) {
        return prisma.team.update({ where: { id: existing.id }, data: details });
    }

    return prisma.team.create({ data: { ...details, slug } });
}

/**
 * Crea o actualiza un partido (por id de la API). Al actualizar solo se tocan los datos
 * que vienen de la API: `isIconic`, `tags` y `summary` nunca se sobrescriben.
 */
async function upsertMatch(
    item: ApiFixture,
    homeTeamId: string,
    awayTeamId: string,
    competitionId: string,
    season: string
) {
    const { fixture, teams, goals, league } = item;
    const round = league.round ?? null;
    const date = new Date(fixture.date);

    const apiData = {
        apiId: fixture.id,
        date,
        homeTeamId,
        awayTeamId,
        competitionId,
        homeScore: goals.home ?? 0,
        awayScore: goals.away ?? 0,
        stage: round,
        season,
        ...(fixture.venue?.name ? { stadium: fixture.venue.name } : {}),
    };

    // También reconoce partidos antiguos que aún no tienen el id de la API
    const existing =
        (await prisma.match.findUnique({ where: { apiId: fixture.id }, select: { id: true } })) ??
        (await prisma.match.findFirst({
            where: { apiId: null, homeTeamId, awayTeamId, date },
            select: { id: true },
        }));

    if (existing) {
        await prisma.match.update({ where: { id: existing.id }, data: apiData });
        stats.matchesUpdated += 1;
        return;
    }

    await prisma.match.create({
        data: {
            ...apiData,
            stadium: fixture.venue?.name || 'Estadio Principal',
            isIconic: false,
            tags: ['UEFA Champions League', ...(round ? [round] : []), season],
            summary: `Encuentro de ${round ?? 'la fase de partidos'} entre ${teams.home.name} y ${teams.away.name} (${season}).`,
        },
    });
    stats.matchesCreated += 1;
}

/**
 * Elige qué partidos guardar: todas las eliminatorias (octavos, cuartos, semifinales y final)
 * más unos pocos de la fase de grupos o de liga. Las rondas previas se ignoran.
 */
function selectFixtures(fixtures: ApiFixture[]) {
    const roundOf = (item: ApiFixture) => item.league.round ?? '';
    const byDate = (a: ApiFixture, b: ApiFixture) =>
        new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();

    const knockout = fixtures.filter((item) => KNOCKOUT_STAGE.test(roundOf(item))).sort(byDate);
    const league = fixtures
        .filter((item) => LEAGUE_STAGE.test(roundOf(item)))
        .slice(0, GROUP_MATCHES_PER_SEASON);

    const selected = [...league, ...knockout];

    // Si la competición usa nombres de ronda distintos, se guardan los últimos partidos
    return {
        selected: selected.length > 0 ? selected : fixtures.slice(-10),
        knockout: knockout.length,
        league: league.length,
    };
}

/** Rondas que el seed ignora, con cuántos partidos tiene cada una. */
function ignoredRounds(fixtures: ApiFixture[]) {
    const counts = new Map<string, number>();

    for (const item of fixtures) {
        const round = item.league.round ?? 's/d';
        if (KNOCKOUT_STAGE.test(round) || LEAGUE_STAGE.test(round)) continue;
        counts.set(round, (counts.get(round) ?? 0) + 1);
    }

    return Array.from(counts, ([round, count]) => `${round} (${count})`);
}

async function seedSeasons(competitionId: string) {
    for (let i = 0; i < SEASONS.length; i++) {
        const year = SEASONS[i];
        const label = `${year}-${year + 1}`;

        if (i > 0) await sleep(REQUEST_DELAY_MS);

        console.log(`\n⚽ Temporada ${label}...`);
        const fixtures = await apiGet<ApiFixture>(`/fixtures?league=${LEAGUE_ID}&season=${year}`);
        console.log(`📌 Partidos devueltos por la API: ${fixtures.length}`);

        const { selected, knockout, league } = selectFixtures(fixtures);
        console.log(
            `✅ Se guardarán ${selected.length} partidos: ${knockout} de eliminatorias y ${league} de fase de grupos/liga`
        );

        const skipped = ignoredRounds(fixtures);
        if (skipped.length > 0) {
            console.log(`⏭️  Rondas ignoradas: ${skipped.join(', ')}`);
        }

        // Detalles de TODOS los equipos de la temporada en una sola petición
        let infoById = new Map<number, ApiTeamInfo>();
        try {
            await sleep(REQUEST_DELAY_MS);
            const teamInfo = await apiGet<ApiTeamInfo>(`/teams?league=${LEAGUE_ID}&season=${year}`);
            infoById = new Map(teamInfo.map((entry) => [entry.team.id, entry]));
            console.log(`🏟️  Detalles de equipos recibidos: ${teamInfo.length}`);
        } catch (error) {
            if (error instanceof QuotaError) throw error;
            console.warn(
                '  ⚠️ No se pudieron obtener los detalles de equipos; se conservan los que ya tienes.',
                error instanceof Error ? error.message : error
            );
        }

        for (const item of selected) {
            const homeTeam = await upsertTeam(item.teams.home, infoById.get(item.teams.home.id));
            const awayTeam = await upsertTeam(item.teams.away, infoById.get(item.teams.away.id));

            await upsertMatch(item, homeTeam.id, awayTeam.id, competitionId, label);

            console.log(
                `  └─ ${item.teams.home.name} ${item.goals.home ?? 0}-${item.goals.away ?? 0} ${item.teams.away.name} (${item.league.round ?? 's/d'})`
            );
        }
    }
}

/** Descarga plantillas. Por defecto, solo de equipos que no tienen jugadores todavía. */
async function seedSquads() {
    const teams = await prisma.team.findMany({
        where: {
            apiId: { not: null },
            ...(REFRESH_ALL_SQUADS ? {} : { players: { none: {} } }),
        },
        select: { id: true, name: true, apiId: true },
        orderBy: { name: 'asc' },
    });

    if (teams.length === 0) {
        console.log('\n👥 Todos los equipos ya tienen plantilla (usa --squads para refrescarlas).');
        return;
    }

    console.log(
        `\n👥 Descargando plantillas: ${teams.length} equipo(s), ≈ ${Math.ceil((teams.length * REQUEST_DELAY_MS) / 60000)} min`
    );

    for (const team of teams) {
        await sleep(REQUEST_DELAY_MS);

        try {
            const squads = await apiGet<ApiSquad>(`/players/squads?team=${team.apiId}`);
            const players = squads[0]?.players ?? [];

            for (const p of players) {
                const data = {
                    name: p.name,
                    photoUrl: p.photo ?? null,
                    position: p.position ?? null,
                    number: p.number ?? null,
                    teamId: team.id,
                };

                await prisma.player.upsert({
                    where: { id: `api-player-${p.id}` },
                    update: data,
                    create: { id: `api-player-${p.id}`, ...data },
                });
            }

            console.log(`  ✔ ${team.name}: ${players.length} jugadores`);
        } catch (error) {
            if (error instanceof QuotaError) throw error;
            console.warn(
                `  ⚠️ ${team.name}: no se pudo descargar la plantilla.`,
                error instanceof Error ? error.message : error
            );
        }
    }
}

async function printSummary(interruptedBy: string | null) {
    const [matches, teams, players, withoutSquad] = await Promise.all([
        prisma.match.count(),
        prisma.team.count(),
        prisma.player.count(),
        prisma.team.findMany({
            where: { players: { none: {} } },
            select: { name: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    console.log('\n──────── Resumen ────────');
    console.log(
        `Partidos: ${matches} (nuevos: ${stats.matchesCreated}, actualizados: ${stats.matchesUpdated})`
    );
    console.log(`Equipos: ${teams} · Jugadores: ${players}`);

    if (withoutSquad.length > 0) {
        console.log(
            `⚠️  Equipos sin plantilla (${withoutSquad.length}): ${withoutSquad.map((t: { name: string }) => t.name).join(', ')}`
        );
        console.log('   Vuelve a ejecutar "npm run seed": solo pedirá las que faltan.');
    }

    if (quota.day !== null) {
        console.log(`Peticiones restantes hoy en la API: ${quota.day}`);
    }

    if (interruptedBy) {
        console.log(`\n⛔ El seed se detuvo antes de terminar: ${interruptedBy}`);
        console.log('   Es seguro volver a ejecutarlo cuando la cuota se renueve.');
    } else {
        console.log('\n🎉 Seed completado. Para la línea de tiempo de los partidos: npm run sync:events');
    }
}

async function main() {
    if (!API_KEY) {
        console.error('❌ No se encontró FOOTBALL_API_KEY en tu archivo .env');
        process.exit(1);
    }

    console.log('🛡️  Seed seguro: solo crea o actualiza datos. No borra nada.');

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

    let interruptedBy: string | null = null;

    try {
        await seedSeasons(competition.id);
        await seedSquads();
    } catch (error) {
        if (error instanceof QuotaError) {
            interruptedBy = error.message;
        } else {
            throw error;
        }
    }

    await printSummary(interruptedBy);
}

main()
    .catch((error) => {
        console.error('\n❌ El seed se detuvo por un error:', error);
        console.error('Es seguro volver a ejecutarlo: no borra datos.');
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });