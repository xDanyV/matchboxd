import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const CHAMPIONS_LEAGUE_ID = 2;
const WITH_SQUADS = process.argv.includes('--squads');
const SQUAD_DELAY_MS = 7000;

interface ApiTeamEntry {
    team: {
        id: number;
        name: string;
        country?: string | null;
        founded?: number | null;
    };
    venue?: {
        name?: string | null;
        city?: string | null;
        capacity?: number | null;
        image?: string | null;
    } | null;
}

interface ApiSquadEntry {
    players: {
        id: number;
        name: string;
        number?: number | null;
        position?: string | null;
        photo?: string | null;
    }[];
}

// Mismo criterio que usa prisma/seed.ts para generar el slug
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function enrichTeams() {
    const dbTeams = await prisma.team.findMany({
        select: { id: true, name: true, slug: true, apiId: true },
    });

    if (dbTeams.length === 0) {
        console.log('No hay equipos en la base de datos. Ejecuta primero el seed.');
        return;
    }

    // Temporadas presentes en la BD ("2024-2025" -> 2024), la más reciente primero
    const seasonRows = await prisma.match.findMany({
        select: { season: true },
        distinct: ['season'],
        orderBy: { season: 'desc' },
    });
    const seasonYears = seasonRows
        .map((row) => parseInt(row.season.split('-')[0], 10))
        .filter((year) => !Number.isNaN(year));

    console.log(`🏟️  Equipos en BD: ${dbTeams.length}`);
    console.log(`📡 Peticiones para datos de equipos: ${seasonYears.length}`);

    const byApiId = new Map(dbTeams.filter((t) => t.apiId).map((t) => [t.apiId as number, t]));
    const bySlug = new Map(dbTeams.map((t) => [t.slug, t]));
    const updatedIds = new Set<string>();

    for (const year of seasonYears) {
        console.log(`\n⚽ Temporada ${year}...`);
        const entries = await apiGet<ApiTeamEntry>(
            `/teams?league=${CHAMPIONS_LEAGUE_ID}&season=${year}`
        );

        for (const { team, venue } of entries) {
            const dbTeam = byApiId.get(team.id) ?? bySlug.get(slugify(team.name));

            // Si no está en tu BD o ya se actualizó con una temporada más reciente, se omite
            if (!dbTeam || updatedIds.has(dbTeam.id)) continue;

            try {
                await prisma.team.update({
                    where: { id: dbTeam.id },
                    data: {
                        apiId: team.id,
                        country: team.country ?? undefined,
                        founded: team.founded ?? undefined,
                        venueName: venue?.name ?? undefined,
                        venueCity: venue?.city ?? undefined,
                        venueCapacity: venue?.capacity ?? undefined,
                        venueImageUrl: venue?.image ?? undefined,
                    },
                });
                updatedIds.add(dbTeam.id);
                console.log(`  ✔ ${dbTeam.name} (${team.country ?? 's/d'})`);
            } catch (error) {
                console.error(`  ⚠️ No se pudo actualizar ${dbTeam.name}:`, error);
            }
        }
    }

    const unmatched = dbTeams.filter((t) => !updatedIds.has(t.id));
    console.log(`\n✅ Equipos actualizados: ${updatedIds.size}/${dbTeams.length}`);
    if (unmatched.length > 0) {
        console.log('⚠️  Sin coincidencia en la API:', unmatched.map((t) => t.name).join(', '));
    }
}

async function refreshSquads() {
    const teams = await prisma.team.findMany({
        where: { apiId: { not: null } },
        select: { id: true, name: true, apiId: true },
        orderBy: { name: 'asc' },
    });

    console.log(`\n👥 Actualizando plantillas: ${teams.length} peticiones (≈ ${Math.ceil((teams.length * SQUAD_DELAY_MS) / 60000)} min)`);

    for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        if (i > 0) await sleep(SQUAD_DELAY_MS);

        const squads = await apiGet<ApiSquadEntry>(`/players/squads?team=${team.apiId}`);
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
    }
}

async function main() {
    if (!API_KEY) {
        console.error('❌ No se encontró FOOTBALL_API_KEY en tu archivo .env');
        process.exit(1);
    }

    await enrichTeams();

    if (WITH_SQUADS) {
        await refreshSquads();
    } else {
        console.log('\nℹ️  Usa "npm run enrich:teams -- --squads" para refrescar también las plantillas.');
    }
}

main()
    .catch((e) => {
        console.error('\n❌ El script se detuvo:', e instanceof Error ? e.message : e);
        console.error('Es seguro volver a ejecutarlo: solo actualiza datos, no borra nada.');
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });