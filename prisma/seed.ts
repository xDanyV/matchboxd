import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando carga de datos de prueba...');

    // Limpiar tablas previas
    await prisma.reviewLike.deleteMany();
    await prisma.review.deleteMany();
    await prisma.mvpVote.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.match.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.competition.deleteMany();
    await prisma.user.deleteMany();

    // 1. Crear Usuario de prueba
    const testUser = await prisma.user.create({
        data: {
            name: 'Daniel Valencia',
            username: 'danyvalencia',
            email: 'daniel@example.com',
            bio: 'Apasionado del fútbol táctico y los partidos históricos.',
        },
    });

    // 2. Competiciones
    const worldCup = await prisma.competition.create({
        data: {
            name: 'Copa del Mundo FIFA',
            slug: 'copa-del-mundo',
            type: 'NATIONAL',
        },
    });

    const championsLeague = await prisma.competition.create({
        data: {
            name: 'UEFA Champions League',
            slug: 'uefa-champions-league',
            type: 'CLUB',
        },
    });

    // 3. Equipos
    const argentina = await prisma.team.create({
        data: { name: 'Argentina', shortName: 'ARG', slug: 'argentina', country: 'Argentina' },
    });

    const france = await prisma.team.create({
        data: { name: 'Francia', shortName: 'FRA', slug: 'francia', country: 'Francia' },
    });

    const milan = await prisma.team.create({
        data: { name: 'AC Milan', shortName: 'MIL', slug: 'ac-milan', country: 'Italia' },
    });

    const liverpool = await prisma.team.create({
        data: { name: 'Liverpool FC', shortName: 'LIV', slug: 'liverpool', country: 'Inglaterra' },
    });

    // 4. Jugadores
    const messi = await prisma.player.create({
        data: { name: 'Lionel Messi', position: 'FWD', teamId: argentina.id },
    });

    const mbappe = await prisma.player.create({
        data: { name: 'Kylian Mbappé', position: 'FWD', teamId: france.id },
    });

    const gerrard = await prisma.player.create({
        data: { name: 'Steven Gerrard', position: 'MID', teamId: liverpool.id },
    });

    // 5. Partidos Legendarios
    const qatarFinal = await prisma.match.create({
        data: {
            date: new Date('2022-12-18T15:00:00Z'),
            homeTeamId: argentina.id,
            awayTeamId: france.id,
            homeScore: 3,
            awayScore: 3,
            competitionId: worldCup.id,
            stadium: 'Lusail Iconic Stadium, Qatar',
            stage: 'Gran Final',
            season: '2022',
            isIconic: true,
            tags: ['Final Épica', 'Penales', 'Hat-trick', 'Tiempo Extra'],
            summary:
                'Considerada por muchos la mejor final en la historia de los mundiales. Duelo estelar entre Lionel Messi y Kylian Mbappé resuelto en tanda de penales tras un vibrante 3-3.',
        },
    });

    const istanbulFinal = await prisma.match.create({
        data: {
            date: new Date('2005-05-25T18:45:00Z'),
            homeTeamId: milan.id,
            awayTeamId: liverpool.id,
            homeScore: 3,
            awayScore: 3,
            competitionId: championsLeague.id,
            stadium: 'Atatürk Olympic Stadium, Estambul',
            stage: 'Gran Final',
            season: '2004-2005',
            isIconic: true,
            tags: ['El Milagro de Estambul', 'Remontada Histórica', 'Penales'],
            summary:
                'AC Milan se fue al descanso con una ventaja de 3-0. En una ráfaga de 6 minutos legendarios, el Liverpool empató 3-3 y se coronó en penales.',
        },
    });

    // 6. Reseña & Voto MVP de prueba
    await prisma.review.create({
        data: {
            rating: 10.0,
            title: 'El mejor partido de fútbol jamás jugado',
            content:
                'Emoción pura desde el minuto 1 hasta el penal de Montiel. El drama, las atajadas de Dibu Martínez y el nivel de Messi y Mbappé quedarán en la historia absoluta.',
            userId: testUser.id,
            matchId: qatarFinal.id,
        },
    });

    await prisma.mvpVote.create({
        data: {
            userId: testUser.id,
            matchId: qatarFinal.id,
            playerId: messi.id,
        },
    });

    console.log('✅ Base de datos poblada exitosamente con datos de prueba.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });