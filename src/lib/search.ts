import { cache } from 'react';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    STAGE_CATEGORIES,
    classifyStage,
    normalizeText,
    tokenize,
    type SearchCriteria,
    type SuggestionsPayload,
} from '@/lib/search-params';
import { teamSearchText } from '@/lib/team-aliases';

export const PAGE_SIZE = 8;
const SUGGEST_TEAMS_LIMIT = 4;
const SUGGEST_MATCHES_LIMIT = 5;

const matchInclude = {
    homeTeam: true,
    awayTeam: true,
    competition: true,
    reviews: { select: { rating: true, tags: true } },
    _count: { select: { reviews: true } },
} satisfies Prisma.MatchInclude;

type MatchRow = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

export type SearchMatch = MatchRow & { averageRating: number | null };

export interface SearchTeam {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    crestUrl: string | null;
    country: string | null;
}

/**
 * Listas pequeñas (equipos, estadios, fases, competiciones) que se comparan en
 * memoria ignorando acentos. Así no se necesitan extensiones de Postgres.
 */
export const getSearchDimensions = cache(async () => {
    const [teams, stadiumRows, seasonStages, competitions] = await Promise.all([
        prisma.team.findMany({
            select: {
                id: true,
                name: true,
                shortName: true,
                slug: true,
                crestUrl: true,
                country: true,
            },
            orderBy: { name: 'asc' },
        }),
        prisma.match.findMany({
            where: { stadium: { not: null } },
            select: { stadium: true },
            distinct: ['stadium'],
        }),
        prisma.match.findMany({
            select: { season: true, stage: true },
            distinct: ['season', 'stage'],
        }),
        prisma.competition.findMany({ select: { id: true, name: true } }),
    ]);

    const seasons = Array.from(new Set(seasonStages.map((row) => row.season))).sort().reverse();

    return {
        teams: teams.map((team) => ({ ...team, searchText: teamSearchText(team) })),
        stadiums: stadiumRows
            .map((row) => row.stadium)
            .filter((stadium): stadium is string => Boolean(stadium)),
        seasonStages,
        competitions,
        seasons,
    };
});

export type SearchDimensions = Awaited<ReturnType<typeof getSearchDimensions>>;

/** Categorías de fase que existen en los datos (opcionalmente de una temporada). */
export function getStageOptions(dims: SearchDimensions, season: string | null) {
    const present = new Set(
        dims.seasonStages
            .filter((row) => !season || row.season === season)
            .map((row) => classifyStage(row.stage))
    );

    return STAGE_CATEGORIES.filter((category) => present.has(category.key)).map((category) => ({
        key: category.key,
        label: category.label,
    }));
}

function stageMatchesToken(stage: string, token: string): boolean {
    if (normalizeText(stage).includes(token)) return true;
    if (token.length < 3) return false;

    const category = STAGE_CATEGORIES.find((c) => c.key === classifyStage(stage));
    return Boolean(category && category.keywords.some((keyword) => keyword.includes(token)));
}

/** Equipos que coinciden con TODAS las palabras de la búsqueda. */
export function findTeams(tokens: string[], dims: SearchDimensions, limit: number): SearchTeam[] {
    if (tokens.length === 0) return [];

    return dims.teams
        .filter((team) => tokens.every((token) => team.searchText.includes(token)))
        .sort((a, b) => {
            const aStarts = normalizeText(a.name).startsWith(tokens[0]) ? 0 : 1;
            const bStarts = normalizeText(b.name).startsWith(tokens[0]) ? 0 : 1;
            return aStarts - bStarts || a.name.localeCompare(b.name);
        })
        .slice(0, limit)
        .map((team) => ({
            id: team.id,
            name: team.name,
            shortName: team.shortName,
            slug: team.slug,
            crestUrl: team.crestUrl,
            country: team.country,
        }));
}

/** Una condición por palabra: debe coincidir con algún equipo, fase, estadio o competición. */
function buildTextConditions(tokens: string[], dims: SearchDimensions): Prisma.MatchWhereInput[] {
    const allStages = Array.from(
        new Set(
            dims.seasonStages
                .map((row) => row.stage)
                .filter((stage): stage is string => Boolean(stage))
        )
    );

    return tokens.map((token) => {
        const teamIds = dims.teams
            .filter((team) => team.searchText.includes(token))
            .map((team) => team.id);
        const stages = allStages.filter((stage) => stageMatchesToken(stage, token));
        const stadiums = dims.stadiums.filter((stadium) => normalizeText(stadium).includes(token));
        const competitionIds = dims.competitions
            .filter((competition) => normalizeText(competition.name).includes(token))
            .map((competition) => competition.id);

        const options: Prisma.MatchWhereInput[] = [];
        if (teamIds.length > 0) {
            options.push({ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } });
        }
        if (stages.length > 0) options.push({ stage: { in: stages } });
        if (stadiums.length > 0) options.push({ stadium: { in: stadiums } });
        if (competitionIds.length > 0) options.push({ competitionId: { in: competitionIds } });

        // Si la palabra no coincide con nada, el resultado es vacío
        return options.length > 0 ? { OR: options } : { id: { in: [] } };
    });
}

function buildMatchConditions(
    criteria: SearchCriteria,
    dims: SearchDimensions
): Prisma.MatchWhereInput[] {
    const conditions: Prisma.MatchWhereInput[] = [];

    if (criteria.season) conditions.push({ season: criteria.season });

    if (criteria.stage) {
        const stages = Array.from(
            new Set(
                dims.seasonStages
                    .filter(
                        (row) =>
                            row.stage &&
                            classifyStage(row.stage) === criteria.stage &&
                            (!criteria.season || row.season === criteria.season)
                    )
                    .map((row) => row.stage as string)
            )
        );

        conditions.push(
            criteria.stage === 'other'
                ? { OR: [{ stage: { in: stages } }, { stage: null }] }
                : { stage: { in: stages } }
        );
    }

    conditions.push(...buildTextConditions(tokenize(criteria.q), dims));

    return conditions;
}

function withAverage(match: MatchRow): SearchMatch {
    const total = match.reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
        ...match,
        averageRating: match.reviews.length > 0 ? total / match.reviews.length : null,
    };
}

function clampPage(page: number, total: number) {
    return Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}

export interface SearchMatchesResult {
    matches: SearchMatch[];
    total: number;
    page: number;
    totalPages: number;
    /** true cuando solo se consideran partidos con reseñas (filtro o orden por rating) */
    ratingMode: boolean;
}

export async function searchMatches(
    criteria: SearchCriteria,
    dims: SearchDimensions
): Promise<SearchMatchesResult> {
    const conditions = buildMatchConditions(criteria, dims);
    const baseWhere: Prisma.MatchWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const ratingFilterActive = criteria.min !== null || criteria.max !== null;
    const ratingMode = ratingFilterActive || criteria.sort === 'rating';

    // Camino simple: sin rating, paginación directa en la base de datos
    if (!ratingMode) {
        const total = await prisma.match.count({ where: baseWhere });
        const page = clampPage(criteria.page, total);

        const rows = await prisma.match.findMany({
            where: baseWhere,
            include: matchInclude,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        });

        return {
            matches: rows.map(withAverage),
            total,
            page,
            totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            ratingMode,
        };
    }

    // Camino con rating: el promedio se calcula por partido con una agrupación
    const having: Prisma.ReviewScalarWhereWithAggregatesInput | undefined = ratingFilterActive
        ? {
            rating: {
                _avg: {
                    ...(criteria.min !== null ? { gte: criteria.min } : {}),
                    ...(criteria.max !== null ? { lte: criteria.max } : {}),
                },
            },
        }
        : undefined;

    const groups = await prisma.review.groupBy({
        by: ['matchId'],
        where: { match: baseWhere },
        having,
        _avg: { rating: true },
        _count: { rating: true },
    });

    const total = groups.length;
    const page = clampPage(criteria.page, total);
    const skip = (page - 1) * PAGE_SIZE;

    let rows: MatchRow[];

    if (criteria.sort === 'rating') {
        const ordered = [...groups].sort(
            (a, b) =>
                (b._avg.rating ?? 0) - (a._avg.rating ?? 0) || b._count.rating - a._count.rating
        );
        const pageIds = ordered.slice(skip, skip + PAGE_SIZE).map((group) => group.matchId);

        const found = await prisma.match.findMany({
            where: { id: { in: pageIds } },
            include: matchInclude,
        });

        rows = pageIds
            .map((id) => found.find((match) => match.id === id))
            .filter((match): match is MatchRow => Boolean(match));
    } else {
        rows = await prisma.match.findMany({
            where: { id: { in: groups.map((group) => group.matchId) } },
            include: matchInclude,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip,
            take: PAGE_SIZE,
        });
    }

    return {
        matches: rows.map(withAverage),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        ratingMode,
    };
}

/** Sugerencias rápidas para el buscador del navbar (solo datos públicos). */
export async function searchSuggestions(rawQuery: string): Promise<SuggestionsPayload> {
    const query = rawQuery.trim().slice(0, 60);
    const tokens = tokenize(query);

    if (query.length < 2 || tokens.length === 0) return { teams: [], matches: [] };

    const dims = await getSearchDimensions();
    const teams = findTeams(tokens, dims, SUGGEST_TEAMS_LIMIT);

    const matches = await prisma.match.findMany({
        where: { AND: buildTextConditions(tokens, dims) },
        orderBy: { date: 'desc' },
        take: SUGGEST_MATCHES_LIMIT,
        select: {
            id: true,
            season: true,
            stage: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { name: true, crestUrl: true } },
            awayTeam: { select: { name: true, crestUrl: true } },
        },
    });

    return {
        teams: teams.map((team) => ({
            id: team.id,
            name: team.name,
            slug: team.slug,
            crestUrl: team.crestUrl,
            country: team.country,
        })),
        matches,
    };
}