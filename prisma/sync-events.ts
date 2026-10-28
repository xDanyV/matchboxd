import { Prisma, PrismaClient } from '@prisma/client';
import { buildDrafts, resolveOwnGoals, classify, isShootout, type ApiEvent } from './lib/match-events';

const prisma = new PrismaClient();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const CHAMPIONS_LEAGUE_ID = 2;
const REQUEST_DELAY_MS = 7000;
const RATE_LIMIT_WAIT_MS = 65_000;
const MAX_RATE_LIMIT_RETRIES = 2;
const DATE_TOLERANCE_MS = 36 * 60 * 60 * 1000;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const MATCH_ID = args.find((arg) => arg.startsWith('--match='))?.split('=')[1];
const PROBE_ID = args.find((arg) => arg.startsWith('--probe='))?.split('=')[1];

interface ApiFixture {
    fixture: { id: number; date: string };
    teams: { home: { id: number }; away: { id: number } };
}

/** Se agotó la cuota diaria de la API: no tiene sentido seguir pidiendo datos. */
class QuotaError extends Error { }

const quota: { day: string | null } = { day: null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiGet<T>(path: string, attempt = 0): Promise<T[]> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'x-apisports-key': API_KEY! },
    });

    // Si la API no envía esta cabecera, simplemente no se muestra
    quota.day = res.headers.get('x-ratelimit-requests-remaining');

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} en ${path}`);
    }

    const data = await res.json();

    // API-Football responde 200 incluso con errores (límite, plan, parámetros)
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
            throw new QuotaError('Cuota diaria de la API agotada.');
        }

        throw new Error(`La API devolvió errores en ${path}: ${JSON.stringify(errors)}`);
    }

    return (data.response ?? []) as T[];
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
        return false;
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
    return true;
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

    console.log(
        `\n📋 Partidos a sincronizar: ${pending.length} (≈ ${Math.ceil((pending.length * REQUEST_DELAY_MS) / 60000)} min)`
    );

    const warnings: string[] = [];
    const warn = (message: string) => {
        warnings.push(message);
        console.warn(`  ⚠️ ${message}`);
    };

    let synced = 0;
    let processed = 0;
    let stoppedByQuota = false;

    for (let i = 0; i < pending.length; i++) {
        const match = pending[i];
        if (i > 0) await sleep(REQUEST_DELAY_MS);

        const label = `${match.homeTeam.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.name}`;
        const progress = `[${i + 1}/${pending.length}]`;

        if (!match.apiId || !match.homeTeam.apiId || !match.awayTeam.apiId) {
            processed += 1;
            warn(`${label}: faltan ids de la API (partido o equipos).`);
            continue;
        }

        let events: ApiEvent[];
        try {
            events = await apiGet<ApiEvent>(`/fixtures/events?fixture=${match.apiId}`);
        } catch (error) {
            if (error instanceof QuotaError) {
                stoppedByQuota = true;
                break;
            }
            throw error;
        }

        processed += 1;

        if (events.length === 0) {
            warn(`${label}: la API no devolvió eventos (puede no tener cobertura).`);
            continue;
        }

        const { drafts, skipped, shootout } = buildDrafts(
            events,
            match.homeTeam.apiId,
            match.awayTeam.apiId
        );

        if (drafts.length === 0) {
            warn(`${label}: ningún evento reconocido (${skipped} sin mapear).`);
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
            `  ✔ ${progress} ${label}: ${rows.length} eventos${notes.length ? ` (${notes.join(', ')})` : ''}`
        );

        if (!resolved.consistent) {
            warn(
                `${label}: los goles de la API suman ${resolved.derived.home}-${resolved.derived.away} y el marcador guardado es ${match.homeScore}-${match.awayScore}. La página ocultará los marcadores parciales.`
            );
        }
    }

    console.log(`\n✅ Partidos sincronizados en esta corrida: ${synced}/${pending.length}`);

    if (stoppedByQuota) {
        const remaining = pending.length - processed;
        console.log(`\n⏸️  Cuota diaria de la API agotada. Quedan ${remaining} partido(s) pendientes.`);
        console.log('   El avance ya está guardado. Vuelve a ejecutar "npm run sync:events" cuando la');
        console.log('   cuota se renueve: solo procesará los pendientes (no uses --force).');
    }

    if (warnings.length > 0) {
        console.log(`\n⚠️  Avisos de esta corrida (${warnings.length}):`);
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

    try {
        const requested = await backfillFixtureIds();
        if (requested) await sleep(REQUEST_DELAY_MS);
        await syncEvents();
    } catch (error) {
        if (error instanceof QuotaError) {
            console.log('\n⏸️  Cuota diaria de la API agotada. El avance ya está guardado.');
            console.log('   Vuelve a ejecutar "npm run sync:events" cuando la cuota se renueve.');
        } else {
            throw error;
        }
    }

    if (quota.day !== null) {
        console.log(`\nPeticiones restantes hoy en la API: ${quota.day}`);
    }
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