import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import { auth } from '@/auth';
import RateButton from '@/components/matches/RateButton';
import ReviewSection from '@/components/matches/ReviewSection';
import WatchlistButton from '@/components/matches/WatchlistButton';
import {
    Star,
    Calendar,
    MapPin,
    Sparkles,
    Trophy,
    ArrowLeft,
    Share2,
} from 'lucide-react';

interface MatchPageProps {
    params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function MatchDetailPage({ params }: MatchPageProps) {
    const { id } = await params;
    const session = await auth();

    const match = await prisma.match.findUnique({
        where: { id },
        include: {
            competition: true,
            homeTeam: {
                include: { players: true },
            },
            awayTeam: {
                include: { players: true },
            },
            reviews: {
                include: {
                    user: true,
                    _count: {
                        select: { likes: true },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
            mvpVotes: {
                include: {
                    player: true,
                },
            },
        },
    });

    if (!match) {
        notFound();
    }

    // Consulta si el partido está guardado en la watchlist del usuario
    const isWatchlisted = session?.user?.id
        ? !!(await prisma.watchlist.findUnique({
            where: {
                userId_matchId: {
                    userId: session.user.id,
                    matchId: id,
                },
            },
        }))
        : false;

    // Cálculos de Calificación Promedio
    const totalRating = match.reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = match.reviews.length > 0 ? (totalRating / match.reviews.length).toFixed(1) : null;

    // Formato de Fecha
    const formattedDate = new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'full',
    }).format(new Date(match.date));

    // Cálculo de Porcentajes de MVP
    const totalMvpVotes = match.mvpVotes.length;
    const mvpCounts: { [key: string]: { player: typeof match.mvpVotes[0]['player']; count: number } } = {};

    match.mvpVotes.forEach((vote) => {
        if (!mvpCounts[vote.playerId]) {
            mvpCounts[vote.playerId] = { player: vote.player, count: 0 };
        }
        mvpCounts[vote.playerId].count += 1;
    });

    const mvpList = Object.values(mvpCounts).sort((a, b) => b.count - a.count);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 space-y-6 sm:space-y-8">
                {/* Navegación y Acciones */}
                <div className="flex items-center justify-between gap-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver al inicio</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        {/* Botón dinámico de Watchlist */}
                        <WatchlistButton matchId={match.id} initialIsSaved={isWatchlisted} />

                        <button
                            aria-label="Compartir partido"
                            className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Encabezado Principal del Partido */}
                <section className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-8 md:p-10 backdrop-blur-sm shadow-2xl space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300">
                            <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="uppercase tracking-wider">
                                {match.competition.name} • {match.stage} ({match.season})
                            </span>
                        </div>

                        {match.isIconic && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Partido Icónico</span>
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-2">
                        <div className="text-center md:text-left space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Local</span>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                                {match.homeTeam.name}
                            </h1>
                        </div>

                        <div className="flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800/80 rounded-2xl py-4 px-6 max-w-xs mx-auto w-full shadow-inner">
                            <div className="flex items-center gap-4 text-4xl sm:text-5xl font-black font-mono text-emerald-400">
                                <span>{match.homeScore}</span>
                                <span className="text-slate-600 text-2xl sm:text-3xl font-sans">-</span>
                                <span>{match.awayScore}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] sm:text-xs text-slate-400 font-medium text-center">
                                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="capitalize">{formattedDate}</span>
                            </div>
                        </div>

                        <div className="text-center md:text-right space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Visitante</span>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                                {match.awayTeam.name}
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/60 text-xs sm:text-sm text-slate-400">
                        {match.stadium && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{match.stadium}</span>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                            {match.tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="text-[11px] sm:text-xs bg-slate-800/80 border border-slate-700/50 text-slate-300 px-2.5 py-0.5 rounded-full font-medium"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Resumen Histórico */}
                {match.summary && (
                    <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Contexto del Partido
                        </h3>
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                            {match.summary}
                        </p>
                    </section>
                )}

                {/* Puntuación y Votación MVP */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Puntuación de la Comunidad
                            </span>
                            <div className="flex items-baseline gap-2 mt-3">
                                <div className="flex items-center gap-1.5">
                                    <Star className="w-6 h-6 fill-amber-400 text-amber-400 shrink-0" />
                                    <span className="text-3xl sm:text-4xl font-black text-white">
                                        {avgRating || 'S/R'}
                                    </span>
                                </div>
                                <span className="text-sm text-slate-500 font-semibold">/ 10</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                Basado en {match.reviews.length} {match.reviews.length === 1 ? 'reseña' : 'reseñas'}
                            </p>
                        </div>

                        <RateButton
                            matchId={match.id}
                            matchTitle={`${match.homeTeam.name} vs ${match.awayTeam.name}`}
                            homeTeam={match.homeTeam}
                            awayTeam={match.awayTeam}
                            isAuthenticated={!!session?.user}
                        />
                    </div>

                    <div className="md:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                                    MVP del Partido (Votación)
                                </h3>
                                <span className="text-[11px] sm:text-xs text-slate-400">
                                    {totalMvpVotes} {totalMvpVotes === 1 ? 'voto registrado' : 'votos registrados'}
                                </span>
                            </div>
                            <Sparkles className="w-4 h-4 text-amber-400" />
                        </div>

                        {mvpList.length > 0 ? (
                            <div className="space-y-3">
                                {mvpList.map((item) => {
                                    const percentage = totalMvpVotes > 0 ? Math.round((item.count / totalMvpVotes) * 100) : 0;
                                    return (
                                        <div key={item.player.id} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                                                <span className="text-slate-200">{item.player.name}</span>
                                                <span className="text-emerald-400 font-bold font-mono">{percentage}% ({item.count})</span>
                                            </div>
                                            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 italic">No hay votos de MVP registrados aún.</p>
                        )}
                    </div>
                </div>

                {/* Muro de Reseñas Filtrable y Buscable */}
                <ReviewSection initialReviews={match.reviews} />
            </main>
        </div>
    );
}