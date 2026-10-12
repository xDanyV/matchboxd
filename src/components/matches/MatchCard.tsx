import Link from 'next/link';
import Image from 'next/image';
import { Star, Sparkles, Calendar, MessageSquare } from 'lucide-react';

interface MatchCardProps {
    match: {
        id: string;
        homeTeam: { name: string; crestUrl?: string | null };
        awayTeam: { name: string; crestUrl?: string | null };
        homeScore: number;
        awayScore: number;
        stage?: string | null; // 👈 Cambiado a string | null | undefined
        season: string;
        date: Date;
        isIconic?: boolean;
        tags?: string[];
        averageRating?: number | null;
        _count?: { reviews: number };
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
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 p-6 sm:p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1 space-y-6"
        >
            {/* Cabecera de la Tarjeta */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    UEFA Champions League • {match.stage || 'Fase de Partidos'}
                </span>

                {match.isIconic && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded-full shrink-0">
                        <Sparkles className="w-3 h-3" />
                        <span>Icónico</span>
                    </span>
                )}
            </div>

            {/* Duelo de Equipos y Marcador */}
            <div className="space-y-4 py-1">
                {/* Equipo Local */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {match.homeTeam.crestUrl ? (
                            <Image
                                src={match.homeTeam.crestUrl}
                                alt={match.homeTeam.name}
                                width={40}
                                height={40}
                                style={{ width: 'auto', height: 'auto' }}
                                className="object-contain shrink-0 group-hover:scale-110 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 shrink-0">
                                {match.homeTeam.name.charAt(0)}
                            </div>
                        )}
                        <span className="text-base sm:text-lg font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                            {match.homeTeam.name}
                        </span>
                    </div>
                    <span className="text-2xl font-mono font-black text-emerald-400 shrink-0 ml-2">
                        {match.homeScore}
                    </span>
                </div>

                {/* Equipo Visitante */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {match.awayTeam.crestUrl ? (
                            <Image
                                src={match.awayTeam.crestUrl}
                                alt={match.awayTeam.name}
                                width={40}
                                height={40}
                                style={{ width: 'auto', height: 'auto' }}
                                className="object-contain shrink-0 group-hover:scale-110 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 shrink-0">
                                {match.awayTeam.name.charAt(0)}
                            </div>
                        )}
                        <span className="text-base sm:text-lg font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                            {match.awayTeam.name}
                        </span>
                    </div>
                    <span className="text-2xl font-mono font-black text-emerald-400 shrink-0 ml-2">
                        {match.awayScore}
                    </span>
                </div>
            </div>

            {/* Pie de Tarjeta */}
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
        </Link>
    );
}