import Link from 'next/link';
import { Star, Sparkles, Calendar, MessageSquare } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';
import { ReviewTagChip } from '@/components/reviews/ReviewTagChip';
import { summarizeReviewTags } from '@/lib/review-tags';

interface MatchCardTeam {
    name: string;
    slug: string;
    crestUrl?: string | null;
}

interface MatchCardProps {
    match: {
        id: string;
        homeTeam: MatchCardTeam;
        awayTeam: MatchCardTeam;
        homeScore: number;
        awayScore: number;
        stage?: string | null;
        season: string;
        date: Date;
        isIconic?: boolean;
        tags?: string[];
        averageRating?: number | null;
        reviews?: { tags?: string[] | null }[];
        _count?: { reviews: number };
    };
}

function TeamRow({ team, score }: { team: MatchCardTeam; score: number }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <TeamLink
                slug={team.slug}
                name={team.name}
                className="group/team flex items-center gap-3 min-w-0"
            >
                <TeamCrest
                    name={team.name}
                    crestUrl={team.crestUrl}
                    size={40}
                    className="group-hover/team:scale-110 transition-transform duration-300"
                />
                <span className="text-base sm:text-lg font-black text-white group-hover/team:text-emerald-400 transition-colors truncate">
                    {team.name}
                </span>
            </TeamLink>
            <span className="text-2xl font-mono font-black text-emerald-400 shrink-0 ml-2">
                {score}
            </span>
        </div>
    );
}

export default function MatchCard({ match }: MatchCardProps) {
    const formattedDate = new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(match.date));

    const leadingTags = summarizeReviewTags(match.reviews ?? []).leading.slice(0, 2);

    return (
        <article className="group relative overflow-hidden rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 p-6 sm:p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1">
            {/* Enlace al partido: cubre toda la tarjeta */}
            <Link
                href={`/matches/${match.id}`}
                aria-label={`Ver partido: ${match.homeTeam.name} vs ${match.awayTeam.name}`}
                className="absolute inset-0 z-0"
            />

            {/* Contenido: deja pasar los clics al enlace, salvo los enlaces de equipo */}
            <div className="relative z-10 pointer-events-none flex h-full flex-col justify-between space-y-6">
                {/* Cabecera */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        UEFA Champions League • {match.stage || 'Fase de Partidos'}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {leadingTags.map((slug) => (
                            <ReviewTagChip
                                key={slug}
                                slug={slug}
                                title="Etiqueta más votada por la comunidad"
                            />
                        ))}

                        {match.isIconic && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded-full">
                                <Sparkles className="w-3 h-3" />
                                <span>Icónico</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Equipos y marcador */}
                <div className="space-y-4 py-1">
                    <TeamRow team={match.homeTeam} score={match.homeScore} />
                    <TeamRow team={match.awayTeam} score={match.awayScore} />
                </div>

                {/* Pie */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                        <span className="text-white font-bold text-sm">
                            {match.averageRating ? match.averageRating.toFixed(1) : 'S/R'}
                        </span>
                        <span className="text-slate-500">/ 10</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-slate-400">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                            <span>{match._count?.reviews || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span className="capitalize">{formattedDate}</span>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}