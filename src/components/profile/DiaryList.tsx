import Link from 'next/link';
import { BookOpen, Repeat, Star } from 'lucide-react';
import type { WatchMethod } from '@prisma/client';
import TeamCrest from '@/components/teams/TeamCrest';
import DeleteLogButton from '@/components/profile/DeleteLogButton';
import { formatWatchedOn, getWatchMethodLabel } from '@/lib/watch-methods';

interface DiaryTeam {
    name: string;
    shortName: string | null;
    crestUrl: string | null;
}

export interface DiaryEntry {
    id: string;
    watchedOn: Date;
    method: WatchMethod | null;
    isRewatch: boolean;
    match: {
        id: string;
        season: string;
        stage: string | null;
        homeTeam: DiaryTeam;
        awayTeam: DiaryTeam;
    };
    /** Calificación actual del usuario para ese partido */
    rating: number | null;
}

interface DiaryListProps {
    entries: DiaryEntry[];
    totalLogs: number;
    isOwner: boolean;
}

export default function DiaryList({ entries, totalLogs, isOwner }: DiaryListProps) {
    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                    Diario
                </h2>
                <span className="text-xs sm:text-sm text-slate-400 font-semibold">
                    {totalLogs} {totalLogs === 1 ? 'visionado' : 'visionados'}
                </span>
            </div>

            {entries.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center">
                    {isOwner
                        ? 'Registra los partidos que ves con "Marcar como visto" o al calificarlos.'
                        : 'Este usuario aún no ha registrado partidos.'}
                </p>
            ) : (
                <ol className="divide-y divide-slate-800/80 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                    {entries.map((entry) => {
                        const methodLabel = getWatchMethodLabel(entry.method);
                        const { homeTeam, awayTeam } = entry.match;

                        return (
                            <li key={entry.id} className="flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-slate-900/90 transition-colors">
                                <time
                                    dateTime={entry.watchedOn.toISOString().slice(0, 10)}
                                    className="w-11 sm:w-14 shrink-0 text-center leading-tight"
                                >
                                    <span className="block text-lg font-black text-white tabular-nums">
                                        {formatWatchedOn(entry.watchedOn, { day: 'numeric' })}
                                    </span>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        {formatWatchedOn(entry.watchedOn, { month: 'short', year: '2-digit' })}
                                    </span>
                                </time>

                                <Link href={`/matches/${entry.match.id}`} className="group flex-1 min-w-0 space-y-1">
                                    <span className="flex items-center gap-2 text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                                        {/* En móvil los escudos ceden su espacio al nombre, que puede ocupar dos líneas */}
                                        <TeamCrest name={homeTeam.name} crestUrl={homeTeam.crestUrl} size={20} className="hidden sm:block" />
                                        <span className="line-clamp-2 sm:truncate">
                                            {homeTeam.shortName || homeTeam.name} vs {awayTeam.shortName || awayTeam.name}
                                        </span>
                                        <TeamCrest name={awayTeam.name} crestUrl={awayTeam.crestUrl} size={20} className="hidden sm:block" />
                                    </span>
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                                        {entry.rating !== null && (
                                            <span className="sm:hidden inline-flex items-center gap-0.5 text-amber-400 font-black">
                                                <Star className="w-3 h-3 fill-amber-400" />
                                                {entry.rating.toFixed(1)}
                                            </span>
                                        )}
                                        <span>{[entry.match.stage, entry.match.season].filter(Boolean).join(' • ')}</span>
                                        {methodLabel && <span className="text-slate-400">· {methodLabel}</span>}
                                        {entry.isRewatch && (
                                            <span className="inline-flex items-center gap-1 text-sky-400">
                                                <Repeat className="w-3 h-3" /> Re-vista
                                            </span>
                                        )}
                                    </span>
                                </Link>

                                {entry.rating !== null && (
                                    <span className="hidden sm:inline-flex items-center gap-1 text-amber-400 text-xs font-black shrink-0">
                                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                                        {entry.rating.toFixed(1)}
                                    </span>
                                )}

                                {isOwner && <DeleteLogButton logId={entry.id} />}
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
