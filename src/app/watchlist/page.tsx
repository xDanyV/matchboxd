import { getSession } from '@/lib/session';
import { loginHref } from '@/lib/login';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';
import { Bookmark, Calendar, Trophy, ArrowRight } from 'lucide-react';

export default async function WatchlistPage() {
    const session = await getSession();

    if (!session?.user) {
        redirect(loginHref('/watchlist'));
    }

    const items = await prisma.watchlist.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
            match: {
                include: {
                    homeTeam: true,
                    awayTeam: true,
                    competition: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 pb-28">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">

                {/* Cabecera de la sección */}
                <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 shadow-inner">
                            <Bookmark className="w-6 h-6 fill-emerald-400/20" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                Partidos Por Ver
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                                Partidos pendientes por ver. Al registrarlos en tu diario salen de esta lista.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 self-start sm:self-center">
                        <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 text-emerald-400 text-xs sm:text-sm px-4 py-2 rounded-2xl font-bold shadow-sm">
                            <Bookmark className="w-3.5 h-3.5 fill-emerald-400" />
                            {items.length} {items.length === 1 ? 'partido guardado' : 'partidos guardados'}
                        </span>
                    </div>
                </div>

                {/* Contenido principal o Estado vacío */}
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-800/80 rounded-3xl p-8 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                            <Bookmark className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 max-w-md mx-auto">
                            <h2 className="text-lg font-bold text-slate-200">
                                Aún no has guardado partidos
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400">
                                Explora los encuentros en Matchbox y guárdalos en tu lista personal para consultarlos rápidamente cuando quieras.
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                            >
                                <span>Explorar partidos</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {items.map(({ id, match }) => (
                            <article
                                key={id}
                                className="group relative bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/30 rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between"
                            >
                                <Link
                                    href={`/matches/${match.id}`}
                                    aria-label={`Ver partido: ${match.homeTeam.name} vs ${match.awayTeam.name}`}
                                    className="absolute inset-0 z-0 rounded-3xl"
                                />

                                <div className="relative z-10 pointer-events-none flex h-full flex-col justify-between gap-5">
                                    {/* Cabecera de la tarjeta: Competición y Año */}
                                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3.5">
                                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-emerald-400 truncate pr-2">
                                            <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                                <Trophy className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="truncate">{match.competition.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-mono bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-700/40 text-slate-300 shrink-0">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{new Date(match.date).getFullYear()}</span>
                                        </div>
                                    </div>

                                    {/* Equipos y Marcador */}
                                    <div className="flex items-center justify-between py-2 gap-3">
                                        {/* Equipo Local */}
                                        <TeamLink
                                            slug={match.homeTeam.slug}
                                            name={match.homeTeam.name}
                                            className="group/team flex-1 flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2 sm:gap-3 min-w-0"
                                        >
                                            <span className="font-bold text-sm sm:text-base text-slate-100 group-hover/team:text-emerald-400 transition-colors line-clamp-2 sm:truncate text-center sm:text-right">
                                                {match.homeTeam.shortName || match.homeTeam.name}
                                            </span>
                                            <TeamCrest name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} size={32} />
                                        </TeamLink>

                                        {/* Marcador */}
                                        <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center font-mono font-black text-emerald-400 text-base sm:text-lg shrink-0 shadow-inner">
                                            {match.homeScore} - {match.awayScore}
                                        </div>

                                        {/* Equipo Visitante */}
                                        <TeamLink
                                            slug={match.awayTeam.slug}
                                            name={match.awayTeam.name}
                                            className="group/team flex-1 flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-3 min-w-0"
                                        >
                                            <TeamCrest name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} size={32} />
                                            <span className="font-bold text-sm sm:text-base text-slate-100 group-hover/team:text-emerald-400 transition-colors line-clamp-2 sm:truncate text-center sm:text-left">
                                                {match.awayTeam.shortName || match.awayTeam.name}
                                            </span>
                                        </TeamLink>
                                    </div>

                                    {/* Pie de tarjeta con indicador interactivo */}
                                    <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                                        <span className="group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                                            Ver detalles y calificaciones
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform text-emerald-400" />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}