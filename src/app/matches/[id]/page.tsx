import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import ReviewSection from '@/components/matches/ReviewSection';
import WatchlistButton from '@/components/matches/WatchlistButton';
import ShareButton from '@/components/matches/ShareButton';
import MatchTimeline from '@/components/matches/MatchTimeline';
import FloatingScoreHeader from '@/components/matches/FloatingScoreHeader';
import MatchHeaderSection from '@/components/matches/MatchHeaderSection';
import MatchRatingMvpSection from '@/components/matches/MatchRatingMvpSection';
import { summarizeReviewTags } from '@/lib/review-tags';
import type { TimelineEvent } from '@/lib/match-events';

interface MatchPageProps {
    params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function MatchDetailPage({ params }: MatchPageProps) {
    const { id } = await params;
    const session = await auth();

    const match = await prisma.match.findUnique({
        where: { id },
        include: {
            competition: true,
            homeTeam: { include: { players: true } },
            awayTeam: { include: { players: true } },
            reviews: {
                include: {
                    user: { select: { name: true, username: true, image: true } },
                    match: { include: { homeTeam: true, awayTeam: true } },
                    likes: true,
                    comments: {
                        include: { user: { select: { name: true, image: true } } },
                        orderBy: { createdAt: 'desc' },
                    },
                    _count: { select: { likes: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
            mvpVotes: { include: { player: true } },
            events: { orderBy: { sortOrder: 'asc' } },
        },
    });

    if (!match) notFound();

    const isWatchlisted = session?.user?.id
        ? !!(await prisma.watchlist.findUnique({
            where: { userId_matchId: { userId: session.user.id, matchId: id } },
        }))
        : false;

    const totalRating = match.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = match.reviews.length > 0 ? (totalRating / match.reviews.length).toFixed(1) : null;
    const tagSummary = summarizeReviewTags(match.reviews);

    const formattedDate = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(new Date(match.date));

    const totalMvpVotes = match.mvpVotes.length;
    const mvpCounts: Record<string, { player: typeof match.mvpVotes[0]['player']; count: number }> = {};
    match.mvpVotes.forEach((vote) => {
        if (!mvpCounts[vote.playerId]) {
            mvpCounts[vote.playerId] = { player: vote.player, count: 0 };
        }
        mvpCounts[vote.playerId].count += 1;
    });
    const mvpList = Object.values(mvpCounts).sort((a, b) => b.count - a.count);

    const timelineEvents = match.events.flatMap((event): TimelineEvent[] => {
        if (event.teamId !== match.homeTeamId && event.teamId !== match.awayTeamId) return [];
        return [{
            id: event.id,
            kind: event.type,
            side: event.teamId === match.homeTeamId ? 'home' : 'away',
            minute: event.minute,
            extraMinute: event.extraMinute,
            playerName: event.playerName,
            relatedPlayerName: event.relatedPlayerName,
            detail: event.detail,
        }];
    });

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 pb-28">
            <FloatingScoreHeader
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
            />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 space-y-6 sm:space-y-8">
                {/* Acciones superiores */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400">
                            {match.competition.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <WatchlistButton matchId={match.id} initialIsSaved={isWatchlisted} />
                        <ShareButton match={match} />
                    </div>
                </div>

                {/* Cabecera Principal */}
                <MatchHeaderSection match={match} tagSummary={tagSummary} formattedDate={formattedDate} />

                {/* Resumen Histórico */}
                {match.summary && (
                    <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contexto del Partido</h3>
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{match.summary}</p>
                    </section>
                )}

                {/* Puntuación y MVP */}
                <MatchRatingMvpSection
                    match={match}
                    avgRating={avgRating}
                    tagSummary={tagSummary}
                    mvpList={mvpList}
                    totalMvpVotes={totalMvpVotes}
                    isAuthenticated={!!session?.user}
                />

                {/* Línea de tiempo optimizada para eliminar espacios vacíos */}
                {timelineEvents.length > 0 && (
                    <div className="[&_div:first-child]:mb-0">
                        <MatchTimeline
                            events={timelineEvents}
                            homeTeam={{ name: match.homeTeam.name, crestUrl: match.homeTeam.crestUrl }}
                            awayTeam={{ name: match.awayTeam.name, crestUrl: match.awayTeam.crestUrl }}
                            homeScore={match.homeScore}
                            awayScore={match.awayScore}
                        />
                    </div>
                )}

                {/* Reseñas */}
                <ReviewSection initialReviews={match.reviews} currentUserId={session?.user?.id || ''} />
            </main>
        </div>
    );
}