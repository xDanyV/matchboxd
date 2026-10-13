'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Heart, Calendar, MessageSquare } from 'lucide-react';
import ReviewCommentsModal from './ReviewCommentsModal';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';

interface ReviewCardClientProps {
    review: any;
    currentUserId: string;
    formattedDate: string;
    likesCount: number;
    dislikesCount: number;
}

function TeamChip({
    team,
    fallback,
    crestAfter = false,
}: {
    team: any;
    fallback: string;
    crestAfter?: boolean;
}) {
    const label = team.shortName || team.name || fallback;

    const content = (
        <>
            {!crestAfter && <TeamCrest name={label} crestUrl={team.crestUrl} size={24} className="rounded-md" />}
            <span className="group-hover/team:text-emerald-400 transition-colors">{label}</span>
            {crestAfter && <TeamCrest name={label} crestUrl={team.crestUrl} size={24} className="rounded-md" />}
        </>
    );

    if (!team.slug) {
        return <div className="flex items-center gap-2">{content}</div>;
    }

    return (
        <TeamLink slug={team.slug} name={team.name || label} className="group/team flex items-center gap-2">
            {content}
        </TeamLink>
    );
}

export default function ReviewCardClient({
    review,
    currentUserId,
    formattedDate,
    likesCount,
    dislikesCount,
}: ReviewCardClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Verificación de seguridad por si review o match no están definidos
    if (!review) return null;

    const match = review.match || {};
    const homeTeam = match.homeTeam || {};
    const awayTeam = match.awayTeam || {};
    const competition = match.competition || {};

    return (
        <>
            <article className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 transition-all space-y-4 backdrop-blur-sm">
                {/* Cabecera del Partido */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2 font-bold text-slate-100 text-sm sm:text-base">
                        <TeamChip team={homeTeam} fallback="Local" />

                        <Link
                            href={match.id ? `/matches/${match.id}` : '#'}
                            title="Ver partido"
                            className="bg-slate-800 px-2 py-0.5 rounded text-xs font-mono text-emerald-400 hover:bg-slate-700 transition-colors"
                        >
                            {match.homeScore ?? 0} - {match.awayScore ?? 0}
                        </Link>

                        <TeamChip team={awayTeam} fallback="Visitante" crestAfter />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        {competition.name && (
                            <span className="bg-slate-800/90 border border-slate-700/50 px-2.5 py-1 rounded-md font-medium text-slate-300">
                                {competition.name}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {formattedDate}
                        </span>
                    </div>
                </div>

                {/* Calificación y Título */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 font-bold text-xs sm:text-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{review.rating ? review.rating.toFixed(1) : '0.0'}</span>
                        </div>
                        {review.title && (
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                {review.title}
                            </h2>
                        )}
                    </div>
                </div>

                {/* Contenido de la Reseña */}
                <div className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    {review.hasSpoilers ? (
                        <details className="cursor-pointer group">
                            <summary className="text-amber-400/90 text-xs font-semibold select-none group-open:mb-2">
                                Esta reseña contiene spoilers (haz clic para leer)
                            </summary>
                            <p className="text-slate-300 pt-1">{review.content}</p>
                        </details>
                    ) : (
                        <p>{review.content}</p>
                    )}
                </div>

                {/* Pie de tarjeta con likes y botón de comentarios */}
                <div className="flex items-center justify-between pt-2 text-xs text-slate-400 border-t border-slate-800/60">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <Heart className="w-4 h-4 text-rose-500/80 fill-rose-500/20" />
                            <span>{likesCount} likes</span>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span>Comentarios ({review.comments?.length || 0})</span>
                        </button>
                    </div>

                    <Link
                        href={match.id ? `/matches/${match.id}` : '#'}
                        className="text-slate-400 hover:text-white font-medium transition-colors"
                    >
                        Ver partido completo →
                    </Link>
                </div>
            </article>

            {/* Modal de Comentarios y Reacciones */}
            <ReviewCommentsModal
                review={review}
                currentUserId={currentUserId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}