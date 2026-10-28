import { prisma } from '@/lib/prisma';

/**
 * Goleadores, asistentes y tarjetas de una temporada, calculados con las estadísticas de cada
 * partido que guarda el sync. No se usa /players/topscorers de la API porque mezcla las rondas
 * previas y muestra el club ACTUAL del jugador en vez del que tenía en esa temporada.
 */

export type LeaderCategory = 'goals' | 'assists' | 'yellowCards' | 'redCards';

export interface SeasonLeader {
    rank: number;
    value: number;
    played: number;
    player: { id: string; name: string; photoUrl: string | null };
    team: { name: string; slug: string; crestUrl: string | null } | null;
}

interface AggregateRow {
    playerId: string;
    teamId: string;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    played: number;
}

export async function getSeasonLeaders(competitionId: string, season: string, limit = 20) {
    const [rows, totalMatches, matchesWithDetails] = await Promise.all([
        prisma.$queryRaw<AggregateRow[]>`
            SELECT mp."playerId",
                   -- Si cambió de club a mitad de temporada, cuenta el último con el que jugó
                   (array_agg(mp."teamId" ORDER BY m."date" DESC))[1] AS "teamId",
                   COALESCE(SUM((mp."stats"->>'goals')::int), 0)::int AS "goals",
                   COALESCE(SUM((mp."stats"->>'assists')::int), 0)::int AS "assists",
                   COALESCE(SUM((mp."stats"->>'yellowCards')::int), 0)::int AS "yellowCards",
                   COALESCE(SUM((mp."stats"->>'redCards')::int), 0)::int AS "redCards",
                   COUNT(*) FILTER (WHERE mp."minutes" > 0)::int AS "played"
            FROM "match_players" mp
            JOIN "matches" m ON m."id" = mp."matchId"
            WHERE m."competitionId" = ${competitionId} AND m."season" = ${season}
            GROUP BY mp."playerId"
        `,
        prisma.match.count({ where: { competitionId, season } }),
        prisma.match.count({ where: { competitionId, season, detailsSyncedAt: { not: null } } }),
    ]);

    const categories: LeaderCategory[] = ['goals', 'assists', 'yellowCards', 'redCards'];

    // Ranking por categoría: más valor primero; a igualdad, menos partidos jugados
    const ranked = Object.fromEntries(
        categories.map((category) => {
            const sorted = rows
                .filter((row) => row[category] > 0)
                .sort((a, b) => b[category] - a[category] || a.played - b.played)
                .slice(0, limit);
            // Empates comparten puesto (1, 2, 2, 4...)
            return [category, sorted.map((row) => ({ row, rank: sorted.findIndex((r) => r[category] === row[category]) + 1 }))];
        })
    ) as Record<LeaderCategory, { row: AggregateRow; rank: number }[]>;

    const playerIds = [...new Set(categories.flatMap((c) => ranked[c].map((e) => e.row.playerId)))];
    const teamIds = [...new Set(categories.flatMap((c) => ranked[c].map((e) => e.row.teamId)))];

    const [players, teams] = await Promise.all([
        prisma.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, name: true, photoUrl: true } }),
        prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, slug: true, crestUrl: true } }),
    ]);
    const playerById = new Map(players.map((p) => [p.id, p]));
    const teamById = new Map(teams.map((t) => [t.id, t]));

    const leaders = Object.fromEntries(
        categories.map((category) => [
            category,
            ranked[category].flatMap(({ row, rank }): SeasonLeader[] => {
                const player = playerById.get(row.playerId);
                if (!player) return [];
                return [{ rank, value: row[category], played: row.played, player, team: teamById.get(row.teamId) ?? null }];
            }),
        ])
    ) as Record<LeaderCategory, SeasonLeader[]>;

    return { leaders, totalMatches, matchesWithDetails };
}
