import Link from 'next/link';
import { Star, MessageSquare, Calendar, Sparkles } from 'lucide-react';

interface MatchCardProps {
    match: {
        id: string;
        date: Date;
        homeScore: number;
        awayScore: number;
        stage: string | null;
        season: string;
        isIconic: boolean;
        tags: string[];
        homeTeam: { name: string; shortName: string | null };
        awayTeam: { name: string; shortName: string | null };
        competition: { name: string };
        _count: { reviews: number };
        averageRating: number | null;
    };
}

export default function MatchCard({ match }: MatchCardProps) {
    const formattedDate = new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(match.date));

    return (
        <Link
            href={`/matches/${match.id}`}
            className="group bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60 select-none"
        >
            <div>
                {/* Cabecera: Competición y Tag Legendario */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {match.competition.name} • {match.season}
                    </span>
                    {match.isIconic && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                            <Sparkles className="w-3 h-3" />
                            <span>Icónico</span>
                        </span>
                    )}
                </div>

                {/* Tablero de Marcador */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm sm:text-base font-bold text-slate-100">
                        <span className="truncate pr-2">{match.homeTeam.name}</span>
                        <span className="font-mono text-base sm:text-lg font-black text-emerald-400 shrink-0">
                            {match.homeScore}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm sm:text-base font-bold text-slate-100">
                        <span className="truncate pr-2">{match.awayTeam.name}</span>
                        <span className="font-mono text-base sm:text-lg font-black text-emerald-400 shrink-0">
                            {match.awayScore}
                        </span>
                    </div>
                </div>

                {/* Tags Temáticos */}
                <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
                    {match.tags.slice(0, 3).map((tag, i) => (
                        <span
                            key={i}
                            className="text-[10px] bg-slate-800/80 text-slate-300 px-2.5 py-0.5 rounded-full font-medium"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Pie de Tarjeta: Puntuación y Reseñas */}
            <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span>{match.averageRating ? match.averageRating.toFixed(1) : 'S/R'}</span>
                    <span className="text-[10px] font-normal text-slate-500">/ 10</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] sm:text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{match._count.reviews}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{formattedDate}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}