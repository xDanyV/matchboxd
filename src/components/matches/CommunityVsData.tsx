import Link from 'next/link';
import { playerHref } from '@/lib/players';
import { BarChart3, Equal, Sparkles, Users } from 'lucide-react';
import RatingBadge from '@/components/matches/RatingBadge';

interface CommunityVsDataProps {
    /** Más votado como MVP en Matchbox */
    communityMvp: { id: string; name: string; votes: number; percent: number } | null;
    /** Mejor nota de la API entre los que jugaron */
    topRated: { id: string; name: string; rating: number; teamName: string } | null;
}

/** Lo que votó la gente frente a lo que dicen los datos: algo que las webs de estadísticas no tienen. */
export default function CommunityVsData({ communityMvp, topRated }: CommunityVsDataProps) {
    if (!topRated) return null;

    const agree = communityMvp?.id === topRated.id;

    return (
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                    La comunidad vs. los números
                </h3>
                {communityMvp && (
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${agree ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                        <Equal className="w-3.5 h-3.5" />
                        {agree ? 'Coinciden' : 'No coinciden'}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        MVP de la comunidad
                    </p>
                    {communityMvp ? (
                        <>
                            <p className="text-base font-black text-white flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                                <Link href={playerHref(communityMvp.id)} className="truncate hover:text-emerald-400 transition-colors">{communityMvp.name}</Link>
                            </p>
                            <p className="text-xs text-slate-400">
                                {communityMvp.percent}% de los votos ({communityMvp.votes})
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Aún nadie votó. ¿Quién fue para ti?</p>
                    )}
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                        Mejor nota según los datos
                    </p>
                    <p className="text-base font-black text-white flex items-center gap-2">
                        <Link href={playerHref(topRated.id)} className="truncate hover:text-emerald-400 transition-colors">{topRated.name}</Link>
                        <RatingBadge rating={topRated.rating} />
                    </p>
                    <p className="text-xs text-slate-400">{topRated.teamName}</p>
                </div>
            </div>
        </section>
    );
}
