import Link from 'next/link';
import { Calendar, ChevronLeft, ChevronRight, History, Trophy } from 'lucide-react';
import MatchCard from '@/components/matches/MatchCard';

interface TeamHistorySectionProps {
    history: any[];
    historyCount: number;
    activeSeason: string | null;
    seasons: string[];
    currentPage: number;
    totalPages: number;
    buildHref: (season: string | null, page: number) => string;
}

export default function TeamHistorySection({
    history,
    historyCount,
    activeSeason,
    seasons,
    currentPage,
    totalPages,
    buildHref,
}: TeamHistorySectionProps) {
    return (
        <section id="historial" className="space-y-6 scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Historial</h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                            {historyCount} {historyCount === 1 ? 'partido' : 'partidos'}
                            {activeSeason ? ` en la temporada ${activeSeason}` : ' registrados'}
                        </p>
                    </div>
                </div>

                {seasons.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <Link
                            href={buildHref(null, 1)}
                            scroll={false}
                            className={`inline-flex items-center px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${!activeSeason
                                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                                    : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                                }`}
                        >
                            Todas
                        </Link>
                        {seasons.map((s) => {
                            const isActive = s === activeSeason;
                            return (
                                <Link
                                    key={s}
                                    href={buildHref(s, 1)}
                                    scroll={false}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${isActive
                                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                                            : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                                        }`}
                                >
                                    <Calendar className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                                    <span>{s}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {history.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {history.map((match) => (
                        <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-sm space-y-3">
                    <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-base font-semibold text-slate-300">No hay partidos registrados para este equipo.</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-6 px-2">
                    <p className="text-xs sm:text-sm text-slate-400 font-medium">
                        Página <span className="text-white font-bold">{currentPage}</span> de{' '}
                        <span className="text-white font-bold">{totalPages}</span>
                    </p>

                    <div className="flex items-center gap-2">
                        {currentPage > 1 ? (
                            <Link
                                href={buildHref(activeSeason, currentPage - 1)}
                                scroll={false}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Anterior</span>
                            </Link>
                        ) : (
                            <button disabled className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-600 text-xs font-bold cursor-not-allowed opacity-50">
                                <ChevronLeft className="w-4 h-4" />
                                <span>Anterior</span>
                            </button>
                        )}

                        {currentPage < totalPages ? (
                            <Link
                                href={buildHref(activeSeason, currentPage + 1)}
                                scroll={false}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold active:scale-95"
                            >
                                <span>Siguiente</span>
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <button disabled className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-600 text-xs font-bold cursor-not-allowed opacity-50">
                                <span>Siguiente</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}