import { MatchEventType, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const CHAMPIONS_LEAGUE_ID = 2;
const REQUEST_DELAY_MS = 7000;
const DATE_TOLERANCE_MS = 36 * 60 * 60 * 1000;

/**
 * En API-Football, en un cambio ("subst") `player` suele ser quien SALE y `assist` quien ENTRA.
 * Verifícalo con `npm run sync:events -- --probe=<id>` y cambia este valor si es al revés.
 */
const SUB_PLAYER_IS_OUT = true;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const MATCH_ID = args.find((arg) => arg.startsWith('--match='))?.split('=')[1];
const PROBE_ID = args.find((arg) => arg.startsWith('--probe='))?.split('=')[1];

type Side = 'home' | 'away';

interface ApiFixture {
    fixture: { id: number; date: string };
    teams: { home: { id: number }; away: { id: number } };
}

interface ApiEvent {
    time?: { elapsed?: number | null; extra?: number | null } | null;
    team?: { id?: number | null } | null;
    player?: { name?: string | null } | null;
    assist?: { name?: string | null } | null;
    type?: string | null;
    detail?: string | null;
    comments?: string | null;
}

interface DraftEvent {
    type: MatchEventType;
    side: Side;
    minute: number;
    extraMinute: number | null;
    playerName: string | null;
    relatedPlayerName: string | null;
    detail: string | null;
    order: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const opposite = (side: Side): Side => (side === 'home' ? 'away' : 'home');

async function apiGet<T>(path: string): Promise<T[]> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'x-apisports-key': API_KEY! },
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} en ${path}`);
    }

    const data = await res.json();

    // API-Football responde 200 incluso con errores (límite, plan, parámetros)
    const errors = data.errors;
    const hasErrors = Array.isArray(errors)
        ? errors.length > 0
        : errors && Object.keys(errors).length > 0;

    if (hasErrors) {
        throw new Error(`La API devolvió errores en ${path}: ${JSON.stringify(errors)}`);
    }

    return (data.response ?? []) as T[];
}

function isShootout(event: ApiEvent) {
    return (event.comments ?? '').toLowerCase().includes('shootout');
}

function classify(event: ApiEvent): MatchEventType | null {
    const type = (event.type ?? '').toLowerCase();
    const detail = (event.detail ?? '').toLowerCase();

    if (type === 'goal') {
        if (detail.includes('own')) return 'OWN_GOAL';
        if (detail.includes('missed')) return 'MISSED_PENALTY';
        if (detail.includes('penalty')) return 'PENALTY_GOAL';
        return 'GOAL';
    }

    if (type === 'card') {
        if (detail.includes('second')) return 'SECOND_YELLOW';
        if (detail.includes('red')) return 'RED_CARD';
        if (detail.includes('yellow')) return 'YELLOW_CARD';
        return null;
    }

    if (type === 'subst') return 'SUBSTITUTION';
    if (type === 'var') return 'VAR';

    return null;
}

function buildDrafts(events: ApiEvent[], homeApiId: number, awayApiId: number) {
    const drafts: DraftEvent[] = [];
    let skipped = 0;
    let shootout = 0;

    events.forEach((event, order) => {
        if (isShootout(event)) {
            shootout += 1;
            return;
        }

        const type = classify(event);
        const teamId = event.team?.id;
        const side: Side | null =
            teamId === homeApiId ? 'home' : teamId === awayApiId ? 'away' : null;

        if (!type || !side) {
            skipped += 1;
            return;
        }

        const apiPlayer = event.player?.name ?? null;
        const apiAssist = event.assist?.name ?? null;

        let playerName = apiPlayer;
        let relatedPlayerName = apiAssist;

        // Normalizamos los cambios: playerName = quien entra, relatedPlayerName = quien sale
        if (type === 'SUBSTITUTION') {
            playerName = SUB_PLAYER_IS_OUT ? apiAssist : apiPlayer;
            relatedPlayerName = SUB_PLAYER_IS_OUT ? apiPlayer : apiAssist;
        }

        drafts.push({
            type,
            side,
            minute: event.time?.elapsed ?? 0,
            extraMinute: event.time?.extra ?? null,
            playerName,
            relatedPlayerName,
            detail: event.detail ?? null,
            order,
        });
    });

    drafts.sort(
        (a, b) =>
            a.minute - b.minute ||
            (a.extraMinute ?? 0) - (b.extraMinute ?? 0) ||
            a.order - b.order
    );

    return { drafts, skipped, shootout };
}

type OwnGoalMode = 'committer' | 'beneficiary';

function creditedScore(drafts: DraftEvent[], mode: OwnGoalMode) {
    const score = { home: 0, away: 0 };

    for (const draft of drafts) {
        if (draft.type === 'GOAL' || draft.type === 'PENALTY_GOAL') {
            score[draft.side] += 1;
        } else if (draft.type === 'OWN_GOAL') {
            score[mode === 'committer' ? opposite(draft.side) : draft.side] += 1;
        }
    }

    return score;
}

/**
 * No sabemos si en un gol en propia puerta la API indica el equipo del jugador o el que anota,
 * así que elegimos la interpretación que cuadra con el marcador final.
 * Tras esto, `side` de un OWN_GOAL es siempre el equipo al que se le acredita el gol.
 */
function resolveOwnGoals(drafts: DraftEvent[], expected: { home: number; away: number }) {
    const matchesExpected = (score: { home: number; away: number }) =>
        score.home === expected.home && score.away === expected.away;

    let mode: OwnGoalMode = 'committer';
    if (
        !matchesExpected(creditedScore(drafts, 'committer')) &&
        matchesExpected(creditedScore(drafts, 'beneficiary'))
    ) {
        mode = 'beneficiary';
    }

    const resolved = drafts.map((draft) =>
        draft.type === 'OWN_GOAL' && mode === 'committer'
            ? { ...draft, side: opposite(draft.side) }
            : draft
    );

    const derived = creditedScore(drafts, mode);

    return { drafts: resolved, derived, consistent: matchesExpected(derived) };
}

/** Muestra cómo etiqueta la API los eventos de un partido, sin tocar la base de datos. */
async function probe(fixtureId: number) {
    const events = await apiGet<ApiEvent>(`/fixtures/events?fixture=${fixtureId}`);

    console.log(`\n🔎 Eventos devueltos para el partido ${fixtureId}: ${events.length}\n`);

    const groups = new Map<string, { count: number; sample: ApiEvent }>();
    for (const event of events) {
        const key = `${event.type ?? '-'} | ${event.detail ?? '-'}${isShootout(event) ? ' (tanda)' : ''}`;
        const entry = groups.get(key);
        if (entry) entry.count += 1;
        else groups.set(key, { count: 1, sample: event });
    }

    console.log('Tipos y detalles de la API → cómo los interpreta este script:');
    for (const [key, { count, sample }] of groups) {
        const mapped = isShootout(sample) ? 'IGNORADO (tanda de penales)' : (classify(sample) ?? 'SIN MAPEAR');
        console.log(`  ${count} × ${key}  →  ${mapped}`);
    }

    const sub = events.find((event) => (event.type ?? '').toLowerCase() === 'subst');
    if (sub) {
        console.log('\n🔁 Primer cambio devuelto por la API:');
        console.log(`   minuto ${sub.time?.elapsed ?? '?'}'`);
        console.log(`   player = ${sub.player?.name ?? '-'}`);
        console.log(`   assist = ${sub.assist?.name ?? '-'}`);
        console.log('   Si "player" es quien SALE, deja SUB_PLAYER_IS_OUT = true.');
        console.log('   Si "player" es quien ENTRA, cámbialo a false y resincroniza con --force.');
    }

    const goal = events.find((event) => classify(event) === 'GOAL');
    if (goal) {
        console.log(
            `\n⚽ Primer gol: minuto ${goal.time?.elapsed ?? '?'}', goleador ${goal.player?.name ?? '-'}, asistente ${goal.assist?.name ?? '-'}`
        );
    }
}

/** Rellena Match.apiId empareando por equipos y fecha (1 petición por temporada). */
async function backfillFixtureIds() {
    const missing = await prisma.match.findMany({
        where: { apiId: null, ...(MATCH_ID ? { id: MATCH_ID } : {}) },
        select: {
            id: true,
            date: true,
            season: true,
            homeTeam: { select: { apiId: true, name: true } },
            awayTeam: { select: { apiId: true, name: true } },
        },
    });

    if (missing.length === 0) {
        console.log('✔ Todos los partidos ya tienen su id de la API.');
        return;
    }

    const years = Array.from(
        new Set(
            missing
                .map((match) => parseInt(match.season.split('-')[0], 10))
                .filter((year) => !Number.isNaN(year))
        )
    );

    console.log(`🔗 Partidos sin id de la API: ${missing.length} (${years.length} petición/es)`);

    let linked = 0;

    for (let i = 0; i < years.length; i++) {
        const year = years[i];
        if (i > 0) await sleep(REQUEST_DELAY_MS);

        const fixtures = await apiGet<ApiFixture>(
            `/fixtures?league=${CHAMPIONS_LEAGUE_ID}&season=${year}`
        );

        for (const match of missing) {
            if (parseInt(match.season.split('-')[0], 10) !== year) continue;

            const label = `${match.homeTeam.name} vs ${match.awayTeam.name}`;

            if (!match.homeTeam.apiId || !match.awayTeam.apiId) {
                console.warn(`  ⚠️ ${label}: algún equipo no tiene apiId (ejecuta npm run enrich:teams).`);
                continue;
            }

            const found = fixtures.find(
                (item) =>
                    item.teams.home.id === match.homeTeam.apiId &&
                    item.teams.away.id === match.awayTeam.apiId &&
                    Math.abs(new Date(item.fixture.date).getTime() - match.date.getTime()) <=
                    DATE_TOLERANCE_MS
            );

            if (!found) {
                console.warn(`  ⚠️ ${label}: no se encontró en la API.`);
                continue;
            }

            try {
                await prisma.match.update({
                    where: { id: match.id },
                    data: { apiId: found.fixture.id },
                });
                linked += 1;
            } catch (error) {
                console.warn(`  ⚠️ ${label}: no se pudo guardar el id (${found.fixture.id}).`, error);
            }
        }
    }

    console.log(`✔ Partidos enlazados con la API: ${linked}/${missing.length}`);
}

async function syncEvents() {
    const pending = await prisma.match.findMany({
        where: {
            apiId: { not: null },
            ...(MATCH_ID ? { id: MATCH_ID } : {}),
            ...(FORCE ? {} : { events: { none: {} } }),
        },
        orderBy: { date: 'asc' },
        select: {
            id: true,
            apiId: true,
            homeScore: true,
            awayScore: true,
            homeTeamId: true,
            awayTeamId: true,
            homeTeam: { select: { apiId: true, name: true } },
            awayTeam: { select: { apiId: true, name: true } },
        },
    });

    if (pending.length === 0) {
        console.log('\n✔ No hay partidos pendientes de sincronizar (usa --force para rehacerlos).');
        return;
    }

    console.log(`\n📋 Partidos a sincronizar: ${pending.length} (≈ ${Math.ceil((pending.length * REQUEST_DELAY_MS) / 60000)} min)`);

    const warnings: string[] = [];
    let synced = 0;

    for (let i = 0; i < pending.length; i++) {
        const match = pending[i];
        if (i > 0) await sleep(REQUEST_DELAY_MS);

        const label = `${match.homeTeam.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.name}`;

        if (!match.apiId || !match.homeTeam.apiId || !match.awayTeam.apiId) {
            warnings.push(`${label}: faltan ids de la API (partido o equipos).`);
            continue;
        }

        const events = await apiGet<ApiEvent>(`/fixtures/events?fixture=${match.apiId}`);

        if (events.length === 0) {
            warnings.push(`${label}: la API no devolvió eventos (puede no tener cobertura).`);
            console.log(`  ⚠️ ${label}: sin eventos`);
            continue;
        }

        const { drafts, skipped, shootout } = buildDrafts(
            events,
            match.homeTeam.apiId,
            match.awayTeam.apiId
        );

        if (drafts.length === 0) {
            warnings.push(`${label}: ningún evento reconocido (${skipped} sin mapear).`);
            continue;
        }

        const resolved = resolveOwnGoals(drafts, {
            home: match.homeScore,
            away: match.awayScore,
        });

        const rows: Prisma.MatchEventCreateManyInput[] = resolved.drafts.map((draft, index) => ({
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

        await prisma.$transaction([
            prisma.matchEvent.deleteMany({ where: { matchId: match.id } }),
            prisma.matchEvent.createMany({ data: rows }),
        ]);

        synced += 1;

        const notes: string[] = [];
        if (skipped > 0) notes.push(`${skipped} sin mapear`);
        if (shootout > 0) notes.push(`${shootout} de tanda ignorados`);

        console.log(
            `  ✔ ${label}: ${rows.length} eventos${notes.length ? ` (${notes.join(', ')})` : ''}`
        );

        if (!resolved.consistent) {
            warnings.push(
                `${label}: los goles de la API suman ${resolved.derived.home}-${resolved.derived.away} y el marcador guardado es ${match.homeScore}-${match.awayScore}. La página ocultará los marcadores parciales.`
            );
        }
    }

    console.log(`\n✅ Partidos sincronizados: ${synced}/${pending.length}`);

    if (warnings.length > 0) {
        console.log('\n⚠️  Avisos:');
        warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
}

async function main() {
    if (!API_KEY) {
        console.error('❌ No se encontró FOOTBALL_API_KEY en tu archivo .env');
        process.exit(1);
    }

    if (PROBE_ID) {
        const fixtureId = Number(PROBE_ID);
        if (!Number.isInteger(fixtureId)) {
            console.error('❌ Usa --probe=<id numérico del partido en la API>, por ejemplo --probe=1374812');
            process.exit(1);
        }
        await probe(fixtureId);
        return;
    }

    await backfillFixtureIds();
    await sleep(REQUEST_DELAY_MS);
    await syncEvents();
}

main()
    .catch((error) => {
        console.error('\n❌ El script se detuvo:', error instanceof Error ? error.message : error);
        console.error('Es seguro volver a ejecutarlo: solo actualiza ids y eventos, no borra otros datos.');
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });