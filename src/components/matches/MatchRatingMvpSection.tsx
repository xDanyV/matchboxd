import Image from 'next/image';
import { Star, Sparkles, User } from 'lucide-react';
import RateButton from '@/components/matches/RateButton';
import { ReviewTagChip } from '@/components/reviews/ReviewTagChip';
import type { ExistingReview } from '@/components/matches/ReviewModal';

interface MatchRatingMvpProps {
    match: any;
    avgRating: string | null;
    tagSummary: any;
    mvpList: any[];
    totalMvpVotes: number;
    isAuthenticated: boolean;
    existingReview: ExistingReview | null;
    existingMvpPlayerId: string | null;
    timesWatched: number;
}

export default function MatchRatingMvpSection({
    match,
    avgRating,
    tagSummary,
    mvpList,
    totalMvpVotes,
    isAuthenticated,
    existingReview,
    existingMvpPlayerId,
    timesWatched,
}: MatchRatingMvpProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Puntuación de la Comunidad
                    </span>
                    <div className="flex items-baseline gap-2 mt-3">
                        <div className="flex items-center gap-1.5">
                            <Star className="w-6 h-6 fill-amber-400 text-amber-400 shrink-0" />
                            <span className="text-3xl sm:text-4xl font-black text-white">{avgRating || 'S/R'}</span>
                        </div>
                        <span className="text-sm text-slate-500 font-semibold">/ 10</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Basado en {match.reviews.length} {match.reviews.length === 1 ? 'calificación' : 'calificaciones'}
                    </p>

                    {tagSummary.counts.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Etiquetas de la comunidad
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {tagSummary.counts.slice(0, 5).map((item: any) => (
                                    <ReviewTagChip key={item.slug} slug={item.slug} count={item.count} highlight={item.slug === tagSummary.main} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <RateButton
                    matchId={match.id}
                    matchTitle={`${match.homeTeam.name} vs ${match.awayTeam.name}`}
                    matchDate={new Date(match.date).toISOString()}
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                    isAuthenticated={isAuthenticated}
                    existingReview={existingReview}
                    existingMvpPlayerId={existingMvpPlayerId}
                    timesWatched={timesWatched}
                />
            </div>

            <div className="md:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                            MVP del Partido (Votación)
                        </h3>
                        <span className="text-[11px] sm:text-xs text-slate-400">
                            {totalMvpVotes} {totalMvpVotes === 1 ? 'voto registrado' : 'votos registrados'}
                        </span>
                    </div>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                </div>

                {mvpList.length > 0 ? (
                    <div className="space-y-3.5">
                        {mvpList.map((item) => {
                            const percentage = totalMvpVotes > 0 ? Math.round((item.count / totalMvpVotes) * 100) : 0;
                            return (
                                <div key={item.player.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {item.player.photoUrl ? (
                                                <Image
                                                    src={item.player.photoUrl}
                                                    alt={item.player.name}
                                                    width={32}
                                                    height={32}
                                                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-800"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            )}
                                            <span className="text-slate-200 truncate">{item.player.name}</span>
                                        </div>
                                        <span className="text-emerald-400 font-bold font-mono shrink-0 ml-2">
                                            {percentage}% ({item.count})
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 italic">No hay votos de MVP registrados aún.</p>
                )}
            </div>
        </div>
    );
}