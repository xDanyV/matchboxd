import { Prisma, PrismaClient } from '@prisma/client';
import { BudgetError, QuotaError, createApiClient, type ApiClient } from './lib/api-football';
import { buildDrafts, resolveOwnGoals, type ApiEvent } from './lib/match-events';
import { normalizePlayerStats, normalizeTeamStats } from '../src/lib/match-stats';

/**
 * Sync diario: aprovecha la cuota gratis de API-Football para completar la base de datos
 * poco a poco. Se puede ejecutar todos los días (o varias veces): nunca repite trabajo.
 *
 *   1. Por temporada (una sola vez): todos los partidos, datos de equipos y tabla.
 *   2. Con lo que quede del presupuesto: detalle completo de cada partido (1 petición por
 *      partido): eventos, alineaciones, estadísticas de equipo y de cada jugador.
 *   3. Cuando ya no quedan partidos: la trayectoria de cada jugador (1 petición por jugador),
 *      empezando por los que más partidos tienen.
 *
 * Uso:
 *   npm run sync:daily                     -> gasta hasta 90 peticiones
 *   npm run sync:daily -- --budget=20      -> otro presupuesto
 *   npm run sync:daily -- --refresh        -> vuelve a bajar tabla y partidos de cada temporada
 *
 * El plan gratis solo da acceso a las temporadas 2022 a 2024.
 */

const prisma = new PrismaClient();

const LEAGUE_ID = 2; // UEFA Champions League
const COMPETITION_SLUG = 'uefa-champions-league';
const SEASONS = [2024, 2023, 2022];
const DEFAULT_BUDGET = 90;

// Fase de grupos/liga y eliminatorias. Las rondas previas (clasificación) se ignoran.
const INCLUDED_ROUNDS = /Group|League Stage|League Phase|Knockout Round Play-offs|Round of 16|Quarter-finals|Semi-finals|^Final$/;

const args = process.argv.slice(2);
const budgetArg = Number(args.find((a) => a.startsWith('--budget='))?.split('=')[1] ?? DEFAULT_BUDGET);
// Entero entre 1 y 100 (lo máximo que da el plan gratis en un día)
const BUDGET = Number.isInteger(budgetArg) && budgetArg > 0 ? Math.min(budgetArg, 100) : DEFAULT_BUDGET;
const REFRESH = args.includes('--refresh');

// -------------------------------------------------------------
// Tipos de la API (solo lo que usamos)
// -------------------------------------------------------------

interface ApiTeamRef {
    id: number;
    name: string;
    logo?: string | null;
}

interface ApiFixture {
    fixture: { id: number; date: string; referee?: string | null; venue?: { name?: string | null } | null };
    league: { round?: string | null; logo?: string | null };
    teams: { home: ApiTeamRef; away: ApiTeamRef };
    goals: { home: number | null; away: number | null };
    score?: {
        halftime?: { home: number | null; away: number | null };
        penalty?: { home: number | null; away: number | null };
    };
    events?: ApiEvent[];
    lineups?: ApiLineup[];
    statistics?: { team: { id: number }; statistics: { type: string; value: unknown }[] }[];
    players?: { team: { id: number }; players: ApiPlayerStats[] }[];
}

interface ApiLineupPlayer {
    player: { id: number; name: string; number?: number | null; pos?: string | null; grid?: string | null };
}

interface ApiLineup {
    team: {
        id: number;
        colors?: {
            player?: { primary?: string; number?: string };
            goalkeeper?: { primary?: string };
        } | null;
    };
    coach?: { name?: string | null; photo?: string | null } | null;
    formation?: string | null;
    startXI?: ApiLineupPlayer[];
    substitutes?: ApiLineupPlayer[];
}

interface ApiPlayerStats {
    player: { id: number; name: string; photo?: string | null };
    statistics: (Record<string, Record<string, unknown> | undefined> & {
        games?: { minutes?: number | null; number?: number | null; position?: string | null; rating?: string | null; captain?: boolean };
    })[];
}

interface ApiTeamInfo {
    team: { id: number; name?: string | null; country?: string | null; founded?: number | null; logo?: string | null };
    venue?: { name?: string | null; city?: string | null; capacity?: number | null; image?: string | null } | null;
}

interface ApiStandingRow {
    rank: number;
    team: ApiTeamRef;
    points: number;
    goalsDiff: number;
    group?: string | null;
    form?: string | null;
    description?: string | null;
    all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}


// -------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const seasonLabel = (year: number) => `${year}-${year + 1}`;
const playerId = (apiId: number) => `api-player-${apiId}`;

const POSITION_NAMES: Record<string, string> = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', F: 'Attacker' };

const summary = { matchesCreated: 0, matchesUpdated: 0, details: 0, careers: 0, warnings: [] as string[] };

function warn(message: string) {
    summary.warnings.push(message);
    console.warn(`  ⚠️ ${message}`);
}

/** Busca un equipo por id de la API (o por slug, como el seed); si no existe lo crea con lo mínimo. */
async function ensureTeam(ref: ApiTeamRef): Promise<string> {
    const slug = slugify(ref.name);
    const existing = await prisma.team.findFirst({
        where: { OR: [{ apiId: ref.id }, { slug }] },
        select: { id: true, apiId: true, crestUrl: true },
    });

    if (existing) {
        if (existing.apiId === null || (!existing.crestUrl && ref.logo)) {
            await prisma.team.update({
                where: { id: existing.id },
                data: { apiId: ref.id, ...(ref.logo && !existing.crestUrl ? { crestUrl: ref.logo } : {}) },
            });
        }
        return existing.id;
    }

    const created = await prisma.team.create({
        data: { name: ref.name, slug, apiId: ref.id, crestUrl: ref.logo ?? null },
        select: { id: true },
    });
    return created.id;
}

/**
 * Crea los jugadores que aún no existen. Los nuevos quedan SIN equipo: aparecen en partidos
 * y estadísticas, pero no se meten en la plantilla actual del club.
 */
async function ensurePlayers(players: { id: number; name: string; photo?: string | null; pos?: string | null }[]) {
    if (players.length === 0) return;
    await prisma.player.createMany({
        data: players.map((p) => ({
            id: playerId(p.id),
            name: p.name,
            photoUrl: p.photo ?? null,
            position: p.pos ? POSITION_NAMES[p.pos] ?? null : null,
        })),
        skipDuplicates: true,
    });
}

// -------------------------------------------------------------
// Fase 1: datos de temporada
// -------------------------------------------------------------

async function syncFixtures(api: ApiClient, competitionId: string, year: number) {
    const season = seasonLabel(year);
    const fixtures = await api.get<ApiFixture>(`/fixtures?league=${LEAGUE_ID}&season=${year}`);
    const selected = fixtures.filter((item) => INCLUDED_ROUNDS.test(item.league.round ?? ''));

    const logo = fixtures[0]?.league.logo;
    if (logo) {
        await prisma.competition.updateMany({ where: { id: competitionId, logoUrl: null }, data: { logoUrl: logo } });
    }

    for (const item of selected) {
        const [homeTeamId, awayTeamId] = await Promise.all([ensureTeam(item.teams.home), ensureTeam(item.teams.away)]);
        const round = item.league.round ?? null;

        const apiData = {
            apiId: item.fixture.id,
            date: new Date(item.fixture.date),
            homeTeamId,
            awayTeamId,
            competitionId,
            homeScore: item.goals.home ?? 0,
            awayScore: item.goals.away ?? 0,
            stage: round,
            season,
            ...(item.fixture.venue?.name ? { stadium: item.fixture.venue.name } : {}),
        };

        const existing = await prisma.match.findUnique({ where: { apiId: item.fixture.id }, select: { id: true } });
        if (existing) {
            await prisma.match.update({ where: { id: existing.id }, data: apiData });
            summary.matchesUpdated += 1;
        } else {
            await prisma.match.create({
                data: { ...apiData, tags: ['UEFA Champions League', ...(round ? [round] : []), season] },
            });
            summary.matchesCreated += 1;
        }
    }

    console.log(`  ✔ Partidos ${season}: ${selected.length} (se ignoraron ${fixtures.length - selected.length} de rondas previas)`);
}

async function syncTeamDetails(api: ApiClient, year: number) {
    const teams = await api.get<ApiTeamInfo>(`/teams?league=${LEAGUE_ID}&season=${year}`);
    let updated = 0;

    for (const { team, venue } of teams) {
        // Un dato que falte en la API nunca borra el que ya teníamos
        const data = {
            ...(team.logo ? { crestUrl: team.logo } : {}),
            ...(team.country ? { country: team.country } : {}),
            ...(team.founded ? { founded: team.founded } : {}),
            ...(venue?.name ? { venueName: venue.name } : {}),
            ...(venue?.city ? { venueCity: venue.city } : {}),
            ...(venue?.capacity ? { venueCapacity: venue.capacity } : {}),
            ...(venue?.image ? { venueImageUrl: venue.image } : {}),
        };
        const { count } = await prisma.team.updateMany({ where: { apiId: team.id }, data });
        updated += count;
    }

    console.log(`  ✔ Datos de equipos ${seasonLabel(year)}: ${updated} actualizados`);
}

async function syncStandings(api: ApiClient, competitionId: string, year: number) {
    const season = seasonLabel(year);
    const response = await api.get<{ league: { standings: ApiStandingRow[][] } }>(`/standings?league=${LEAGUE_ID}&season=${year}`);
    const tables = response[0]?.league.standings ?? [];
    const multipleGroups = tables.length > 1;

    const rows: Prisma.StandingCreateManyInput[] = [];
    for (const table of tables) {
        for (const row of table) {
            rows.push({
                competitionId,
                season,
                groupName: multipleGroups ? row.group ?? '' : '',
                rank: row.rank,
                teamId: await ensureTeam(row.team),
                points: row.points,
                played: row.all.played,
                win: row.all.win,
                draw: row.all.draw,
                lose: row.all.lose,
                goalsFor: row.all.goals.for,
                goalsAgainst: row.all.goals.against,
                goalsDiff: row.goalsDiff,
                form: row.form ?? null,
                description: row.description ?? null,
            });
        }
    }

    await prisma.$transaction([
        prisma.standing.deleteMany({ where: { competitionId, season } }),
        prisma.standing.createMany({ data: rows }),
    ]);

    console.log(`  ✔ Tabla ${season}: ${rows.length} filas en ${tables.length} grupo(s)`);
}

async function syncSeasonData(api: ApiClient, competitionId: string) {
    for (const year of SEASONS) {
        const season = seasonLabel(year);
        const record = await prisma.competitionSeason.upsert({
            where: { competitionId_season: { competitionId, season } },
            update: {},
            create: { competitionId, season, apiSeason: year },
        });

        const steps: { field: 'fixturesSyncedAt' | 'teamsSyncedAt' | 'standingsSyncedAt'; run: () => Promise<void> }[] = [
            { field: 'fixturesSyncedAt', run: () => syncFixtures(api, competitionId, year) },
            { field: 'teamsSyncedAt', run: () => syncTeamDetails(api, year) },
            { field: 'standingsSyncedAt', run: () => syncStandings(api, competitionId, year) },
        ];

        for (const step of steps) {
            if (record[step.field] && !REFRESH) continue;
            if (step === steps[0]) console.log(`\n📅 Temporada ${season}`);
            await step.run();
            await prisma.competitionSeason.update({ where: { id: record.id }, data: { [step.field]: new Date() } });
        }
    }
}

// -------------------------------------------------------------
// Fase 2: detalle de cada partido
// -------------------------------------------------------------

async function importMatchDetails(
    match: { id: string; apiId: number; homeScore: number; awayScore: number; homeTeamId: string; awayTeamId: string },
    item: ApiFixture
) {
    const homeApiId = item.teams.home.id;
    const awayApiId = item.teams.away.id;
    const teamIdFor = (apiTeamId: number) =>
        apiTeamId === homeApiId ? match.homeTeamId : apiTeamId === awayApiId ? match.awayTeamId : null;

    // Eventos (misma lógica que sync-events)
    const { drafts } = buildDrafts(item.events ?? [], homeApiId, awayApiId);
    const resolved = resolveOwnGoals(drafts, { home: match.homeScore, away: match.awayScore });
    const eventRows: Prisma.MatchEventCreateManyInput[] = resolved.drafts.map((draft, index) => ({
        matchId: match.id,
        teamId: draft.side === 'home' ? match.homeTeamId : match.awayTeamId,
        type: draft.type,
        minute: draft.minute,
        extraMinute: draft.extraMinute,
        sortOrder: index,
        playerName: draft.playerName,
        relatedPlayerName: draft.relatedPlayerName,
        detail: draft.detail,
    }));

    // Estadísticas de equipo
    const statRows: Prisma.MatchTeamStatsCreateManyInput[] = [];
    for (const entry of item.statistics ?? []) {
        const teamId = teamIdFor(entry.team.id);
        if (teamId) statRows.push({ matchId: match.id, teamId, stats: normalizeTeamStats(entry.statistics) as Prisma.InputJsonValue });
    }

    // Alineaciones + jugadores
    const lineupRows: Prisma.MatchLineupCreateManyInput[] = [];
    const players = new Map<number, Prisma.MatchPlayerCreateManyInput>();
    const playerRefs = new Map<number, { id: number; name: string; photo?: string | null; pos?: string | null }>();

    for (const lineup of item.lineups ?? []) {
        const teamId = teamIdFor(lineup.team.id);
        if (!teamId) continue;

        lineupRows.push({
            matchId: match.id,
            teamId,
            formation: lineup.formation ?? null,
            coachName: lineup.coach?.name ?? null,
            coachPhotoUrl: lineup.coach?.photo ?? null,
            shirtColor: lineup.team.colors?.player?.primary ?? null,
            numberColor: lineup.team.colors?.player?.number ?? null,
            keeperColor: lineup.team.colors?.goalkeeper?.primary ?? null,
        });

        const add = (entries: ApiLineupPlayer[] | undefined, isStarter: boolean) => {
            for (const { player } of entries ?? []) {
                if (!player?.id) continue;
                playerRefs.set(player.id, { id: player.id, name: player.name, pos: player.pos });
                players.set(player.id, {
                    matchId: match.id,
                    teamId,
                    playerId: playerId(player.id),
                    number: player.number ?? null,
                    position: player.pos ?? null,
                    grid: isStarter ? player.grid ?? null : null,
                    isStarter,
                });
            }
        };
        add(lineup.startXI, true);
        add(lineup.substitutes, false);
    }

    for (const team of item.players ?? []) {
        const teamId = teamIdFor(team.team.id);
        if (!teamId) continue;

        for (const entry of team.players) {
            const stats = entry.statistics[0];
            if (!stats) continue;
            const games = stats.games ?? {};
            const rating = games.rating ? parseFloat(games.rating) : null;

            // El nombre completo y la foto vienen aquí (en la alineación el nombre es corto)
            playerRefs.set(entry.player.id, { id: entry.player.id, name: entry.player.name, photo: entry.player.photo, pos: games.position });

            const base = players.get(entry.player.id) ?? {
                matchId: match.id,
                teamId,
                playerId: playerId(entry.player.id),
                number: games.number ?? null,
                position: games.position ?? null,
                isStarter: false,
            };
            players.set(entry.player.id, {
                ...base,
                minutes: games.minutes ?? null,
                rating: Number.isFinite(rating) ? rating : null,
                isCaptain: Boolean(games.captain),
                stats: normalizePlayerStats(stats) as Prisma.InputJsonValue,
            });
        }
    }

    await ensurePlayers([...playerRefs.values()]);

    const halftime = item.score?.halftime;
    const penalty = item.score?.penalty;

    await prisma.$transaction([
        prisma.matchEvent.deleteMany({ where: { matchId: match.id } }),
        prisma.matchEvent.createMany({ data: eventRows }),
        prisma.matchTeamStats.deleteMany({ where: { matchId: match.id } }),
        prisma.matchTeamStats.createMany({ data: statRows }),
        prisma.matchLineup.deleteMany({ where: { matchId: match.id } }),
        prisma.matchLineup.createMany({ data: lineupRows }),
        prisma.matchPlayer.deleteMany({ where: { matchId: match.id } }),
        prisma.matchPlayer.createMany({ data: [...players.values()] }),
        prisma.match.update({
            where: { id: match.id },
            data: {
                referee: item.fixture.referee ?? null,
                homeHalfScore: halftime?.home ?? null,
                awayHalfScore: halftime?.away ?? null,
                homePenalties: penalty?.home ?? null,
                awayPenalties: penalty?.away ?? null,
                detailsSyncedAt: new Date(),
            },
        }),
    ]);

    return { events: eventRows.length, players: players.size, stats: statRows.length, lineups: lineupRows.length, consistent: resolved.consistent };
}

async function syncMatchDetails(api: ApiClient) {
    // Primero los partidos con reseñas (los que la gente está mirando), luego los más recientes
    const pending = await prisma.match.findMany({
        where: { apiId: { not: null }, detailsSyncedAt: null },
        orderBy: [{ reviews: { _count: 'desc' } }, { date: 'desc' }],
        select: {
            id: true, apiId: true, homeScore: true, awayScore: true, homeTeamId: true, awayTeamId: true,
            homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } },
        },
    });

    if (pending.length === 0) {
        console.log('\n✔ Todos los partidos tienen su detalle completo.');
        return 0;
    }

    console.log(`\n⚽ Detalle de partidos: ${pending.length} pendiente(s)`);

    for (const match of pending) {
        const label = `${match.homeTeam.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.name}`;
        const [item] = await api.get<ApiFixture>(`/fixtures?id=${match.apiId}`);

        if (!item) {
            warn(`${label}: la API no devolvió el partido.`);
            continue;
        }

        const result = await importMatchDetails({ ...match, apiId: match.apiId! }, item);
        summary.details += 1;
        console.log(`  ✔ ${label}: ${result.events} eventos, ${result.players} jugadores, ${result.stats} equipos con stats`);
        if (result.lineups === 0) warn(`${label}: sin alineaciones en la API.`);
        if (!result.consistent) warn(`${label}: los goles de los eventos no cuadran con el marcador.`);
    }

    return 0;
}

// -------------------------------------------------------------
// Fase 3: trayectoria de los jugadores
// -------------------------------------------------------------

interface ApiPlayerTeams {
    team: { id: number; name: string; logo?: string | null };
    seasons: number[];
}

async function syncCareers(api: ApiClient) {
    // Solo jugadores que aparecen en partidos: los que tienen página con contenido
    const pending = await prisma.player.findMany({
        where: { careerSyncedAt: null, matchStats: { some: {} } },
        orderBy: { matchStats: { _count: 'desc' } },
        select: { id: true, name: true },
    });

    if (pending.length === 0) {
        console.log('\n✔ Todas las trayectorias de jugadores están descargadas.');
        return;
    }

    console.log(`\n🧭 Trayectorias de jugadores: ${pending.length} pendiente(s)`);

    for (const player of pending) {
        const apiId = Number(player.id.replace('api-player-', ''));
        if (!Number.isInteger(apiId)) {
            await prisma.player.update({ where: { id: player.id }, data: { careerSyncedAt: new Date() } });
            continue;
        }

        const entries = await api.get<ApiPlayerTeams>(`/players/teams?player=${apiId}`);
        const rows = entries.map((entry, index) => ({
            playerId: player.id,
            teamApiId: entry.team.id,
            teamName: entry.team.name,
            teamLogo: entry.team.logo ?? null,
            seasons: [...(entry.seasons ?? [])].sort((a, b) => b - a),
            sortOrder: index,
        }));

        await prisma.$transaction([
            prisma.playerCareerTeam.deleteMany({ where: { playerId: player.id } }),
            prisma.playerCareerTeam.createMany({ data: rows, skipDuplicates: true }),
            prisma.player.update({ where: { id: player.id }, data: { careerSyncedAt: new Date() } }),
        ]);
        summary.careers += 1;
        console.log(`  ✔ ${player.name}: ${rows.length} equipo(s)`);
    }
}

// -------------------------------------------------------------

async function main() {
    const apiKey = process.env.FOOTBALL_API_KEY;
    if (!apiKey) {
        console.error('❌ No se encontró FOOTBALL_API_KEY.');
        process.exit(1);
    }

    const competition = await prisma.competition.upsert({
        where: { slug: COMPETITION_SLUG },
        update: { apiId: LEAGUE_ID },
        create: { name: 'UEFA Champions League', slug: COMPETITION_SLUG, type: 'CLUB', apiId: LEAGUE_ID },
    });

    const api = createApiClient({ apiKey, budget: BUDGET });
    console.log(`🚀 Sync diario · presupuesto: ${BUDGET} peticiones`);

    let stoppedBy: string | null = null;
    try {
        await syncSeasonData(api, competition.id);
        await syncMatchDetails(api);
        await syncCareers(api);
    } catch (error) {
        if (error instanceof BudgetError || error instanceof QuotaError) {
            stoppedBy = error.message;
        } else {
            throw error;
        }
    }

    const pendingDetails = await prisma.match.count({ where: { apiId: { not: null }, detailsSyncedAt: null } });
    const totalMatches = await prisma.match.count();
    const pendingCareers = await prisma.player.count({ where: { careerSyncedAt: null, matchStats: { some: {} } } });

    console.log('\n──────── Resumen ────────');
    console.log(`Peticiones usadas: ${api.used}${api.remainingToday !== null ? ` · quedan hoy: ${api.remainingToday}` : ''}`);
    console.log(`Partidos nuevos: ${summary.matchesCreated} · actualizados: ${summary.matchesUpdated} · con detalle nuevo: ${summary.details}`);
    console.log(`Partidos en total: ${totalMatches} · pendientes de detalle: ${pendingDetails}`);
    console.log(`Trayectorias nuevas: ${summary.careers} · pendientes: ${pendingCareers}`);
    // Se estima con el presupuesto diario normal, no con el de esta corrida (que puede ser una prueba)
    const pendingRequests = pendingDetails + pendingCareers;
    if (pendingRequests > 0) {
        console.log(`Con ${DEFAULT_BUDGET} peticiones al día faltan ≈ ${Math.ceil(pendingRequests / DEFAULT_BUDGET)} día(s).`);
    }
    if (stoppedBy) console.log(`⏸️  Se detuvo: ${stoppedBy} El avance ya está guardado.`);
    if (summary.warnings.length > 0) console.log(`⚠️  Avisos: ${summary.warnings.length}`);
}

main()
    .catch((e) => {
        console.error('\n❌ El sync se detuvo:', e instanceof Error ? e.message : e);
        console.error('Es seguro volver a ejecutarlo: retoma donde se quedó.');
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
