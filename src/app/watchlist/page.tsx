import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { Bookmark, Calendar, Trophy, ArrowRight } from 'lucide-react';

export default async function WatchlistPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/api/auth/signin');
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
        <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Bookmark className="w-6 h-6 fill-emerald-400/20" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            Partidos Por Ver
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400">
                            Tu lista personal de partidos pendientes por calificar o revivir.
                        </p>
                    </div>
                    <span className="ml-auto bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-bold">
                        {items.length} {items.length === 1 ? 'partido' : 'partidos'}
                    </span>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-8 space-y-3">
                        <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
                        <h2 className="text-base font-bold text-slate-300">
                            Aún no has guardado partidos
                        </h2>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Explora los partidos en Matchbox y presiona el marcador para agregarlos a tu lista.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors pt-2"
                        >
                            <span>Explorar partidos</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map(({ id, match }) => (
                            <Link
                                key={id}
                                href={`/matches/${match.id}`}
                                className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between gap-4"
                            >
                                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-3">
                                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                                        <Trophy className="w-3.5 h-3.5" />
                                        <span>{match.competition.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-mono">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        <span>{new Date(match.date).getFullYear()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-1">
                                    <div className="flex-1 text-right font-bold text-sm sm:text-base text-slate-100 group-hover:text-white">
                                        {match.homeTeam.name}
                                    </div>
                                    <div className="px-4 text-center font-mono font-black text-emerald-400 text-lg">
                                        {match.homeScore} - {match.awayScore}
                                    </div>
                                    <div className="flex-1 text-left font-bold text-sm sm:text-base text-slate-100 group-hover:text-white">
                                        {match.awayTeam.name}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}