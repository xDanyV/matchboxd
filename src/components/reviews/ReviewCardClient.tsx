'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Heart, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import ReviewCommentsModal from './ReviewCommentsModal';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';
import { ReviewTagList } from '@/components/reviews/ReviewTagChip';
import ContentActions from '@/components/moderation/ContentActions';

interface ReviewCardClientProps {
    review: any;
    currentUserId: string;
    isAdmin?: boolean;
    formattedDate: string;
    likesCount: number;
    dislikesCount: number;
}

function TeamChip({
    team,
    fallback,
    align = 'left',
}: {
    team: any;
    fallback: string;
    align?: 'left' | 'right';
}) {
    const label = team.shortName || team.name || fallback;

    const content = (
        <div className={`flex items-center gap-2 min-w-0 flex-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
            {align === 'left' && (
                <TeamCrest name={label} crestUrl={team.crestUrl} size={24} className="rounded-md shrink-0" />
            )}
            <span className={`font-bold text-slate-100 text-xs sm:text-sm truncate group-hover/team:text-emerald-400 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}>
                {label}
            </span>
            {align === 'right' && (
                <TeamCrest name={label} crestUrl={team.crestUrl} size={24} className="rounded-md shrink-0" />
            )}
        </div>
    );

    if (!team.slug) {
        return content;
    }

    return (
        <TeamLink slug={team.slug} name={team.name || label} className="group/team flex-1 min-w-0">
            {content}
        </TeamLink>
    );
}

export default function ReviewCardClient({
    review,
    currentUserId,
    isAdmin = false,
    formattedDate,
    likesCount,
}: ReviewCardClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!review) return null;

    const match = review.match || {};
    const homeTeam = match.homeTeam || {};
    const awayTeam = match.awayTeam || {};
    const competition = match.competition || {};
    const tags: string[] = Array.isArray(review.tags) ? review.tags : [];

    return (
        <>
            <article className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-3xl p-4 sm:p-6 transition-all space-y-4 backdrop-blur-sm shadow-md">

                {/* Cabecera de Competición y Fecha (Versión limpia) */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-3">
                    {competition.name ? (
                        <span className="bg-slate-800/80 border border-slate-700/50 px-2.5 py-0.5 rounded-lg font-medium text-slate-300 truncate max-w-45 sm:max-w-none">
                            {competition.name}
                        </span>
                    ) : <div />}

                    <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs text-slate-400 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formattedDate}
                    </span>
                </div>

                {/* Cabecera del Partido: Equipos + Marcador Central Protegido */}
                <div className="flex items-center justify-between gap-2 sm:gap-4 py-1">
                    {/* Equipo Local */}
                    <TeamChip team={homeTeam} fallback="Local" align="right" />

                    {/* Marcador Central Inviolable */}
                    <Link
                        href={match.id ? `/matches/${match.id}` : '#'}
                        title="Ver partido"
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-emerald-400 text-sm sm:text-base shrink-0 self-center flex items-center justify-center gap-1.5 min-w-14.5 text-center shadow-inner hover:border-emerald-500/40 transition-colors"
                    >
                        <span>{match.homeScore ?? 0}</span>
                        <span className="text-slate-600 text-xs font-sans">-</span>
                        <span>{match.awayScore ?? 0}</span>
                    </Link>

                    {/* Equipo Visitante */}
                    <TeamChip team={awayTeam} fallback="Visitante" align="left" />
                </div>

                {/* Calificación y Título */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl text-amber-400 font-black text-xs sm:text-sm shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{review.rating ? review.rating.toFixed(1) : '0.0'}</span>
                        </div>
                        {review.title && (
                            <h2 className="text-sm sm:text-base font-bold text-white truncate">
                                {review.title}
                            </h2>
                        )}
                    </div>
                </div>

                {/* Etiquetas de la reseña */}
                {tags.length > 0 && <ReviewTagList tags={tags} />}

                {/* Contenido de la Reseña con Efecto Spoiler por Hover */}
                <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                    {!review.content ? (
                        <p className="text-slate-500 italic">Calificación sin reseña escrita.</p>
                    ) : review.hasSpoilers ? (
                        <div className="group/spoiler relative">
                            {/* Aviso visual superior */}
                            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1.5 select-none">
                                <span>Spoiler</span>
                            </div>

                            {/* Texto difuminado que se limpia al hacer hover */}
                            <p className="blur-sm hover:blur-none transition-all duration-300 text-slate-300 text-xs sm:text-sm leading-relaxed inline-block cursor-default">
                                {review.content}
                            </p>
                        </div>
                    ) : (
                        <p>{review.content}</p>
                    )}
                </div>

                {/* Pie de tarjeta adaptado para móvil */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-slate-400 border-t border-slate-800/60">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-400 font-medium">
                            <Heart className="w-3.5 h-3.5 text-rose-500/80 fill-rose-500/20" />
                            <span>{likesCount}</span>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 active:scale-95"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Comentarios ({review.comments?.length || 0})</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        <ContentActions
                            kind="review"
                            id={review.id}
                            authorId={review.userId}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                        />
                        <Link
                            href={match.id ? `/matches/${match.id}` : '#'}
                            className="text-slate-400 hover:text-emerald-400 font-medium transition-colors flex items-center gap-1 text-[11px] sm:text-xs"
                        >
                            <span>Ver partido</span>
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </article>

            {/* Modal de Comentarios y Reacciones */}
            <ReviewCommentsModal
                review={review}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}