import { prisma } from '@/lib/prisma';
import { getReviewTag } from '@/lib/review-tags';

interface StatsTeam {
    name: string;
    shortName: string | null;
    slug: string;
    crestUrl: string | null;
}

export interface UserStats {
    matchesWatched: number;
    totalLogs: number;
    rewatches: number;
    stadiumVisits: number;
    watchedThisYear: number;
    ratingsCount: number;
    writtenReviews: number;
    averageRating: number | null;
    /** Índice 0 = nota 1 ... índice 9 = nota 10 */
    ratingDistribution: number[];
    topTeam: { team: StatsTeam; count: number } | null;
    topTag: { slug: string; label: string; count: number } | null;
}

const teamSelect = { name: true, shortName: true, slug: true, crestUrl: true } as const;

export async function getUserStats(userId: string): Promise<UserStats> {
    const [logs, reviews] = await Promise.all([
        prisma.matchLog.findMany({
            where: { userId },
            select: {
                matchId: true,
                method: true,
                isRewatch: true,
                watchedOn: true,
                match: { select: { homeTeam: { select: teamSelect }, awayTeam: { select: teamSelect } } },
            },
        }),
        prisma.review.findMany({
            where: { userId },
            select: { rating: true, tags: true, content: true },
        }),
    ]);

    const currentYear = new Date().getUTCFullYear();

    // Equipos: cada partido cuenta una vez aunque se haya visto varias veces
    const seenMatches = new Map<string, (typeof logs)[number]['match']>();
    for (const log of logs) seenMatches.set(log.matchId, log.match);

    const teamCounts = new Map<string, { team: StatsTeam; count: number }>();
    for (const match of seenMatches.values()) {
        for (const team of [match.homeTeam, match.awayTeam]) {
            const entry = teamCounts.get(team.slug) ?? { team, count: 0 };
            entry.count += 1;
            teamCounts.set(team.slug, entry);
        }
    }

    const ratingDistribution = Array.from({ length: 10 }, () => 0);
    const tagCounts = new Map<string, number>();
    let ratingTotal = 0;

    for (const review of reviews) {
        ratingTotal += review.rating;
        const bucket = Math.min(10, Math.max(1, Math.round(review.rating)));
        ratingDistribution[bucket - 1] += 1;
        for (const tag of review.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    const topTagEntry = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topTagDefinition = topTagEntry ? getReviewTag(topTagEntry[0]) : undefined;

    return {
        matchesWatched: seenMatches.size,
        totalLogs: logs.length,
        rewatches: logs.filter((log) => log.isRewatch).length,
        stadiumVisits: logs.filter((log) => log.method === 'STADIUM').length,
        watchedThisYear: logs.filter((log) => log.watchedOn.getUTCFullYear() === currentYear).length,
        ratingsCount: reviews.length,
        writtenReviews: reviews.filter((review) => review.content).length,
        averageRating: reviews.length > 0 ? ratingTotal / reviews.length : null,
        ratingDistribution,
        topTeam: [...teamCounts.values()].sort((a, b) => b.count - a.count)[0] ?? null,
        topTag: topTagEntry && topTagDefinition
            ? { slug: topTagEntry[0], label: topTagDefinition.label, count: topTagEntry[1] }
            : null,
    };
}
