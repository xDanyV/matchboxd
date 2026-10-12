import Link from 'next/link';
import { Flame, Trophy } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import MatchCard from '@/components/matches/MatchCard';

export const revalidate = 0;

const TOP_LIMIT = 12;

export default async function TopMatchesPage() {
    // 1. Ranking: promedio de calificación por partido (solo partidos con reseñas)
    const ranking = await prisma.review.groupBy({
        by: ['matchId'],
        _avg: { rating: true },
        _count: { rating: true },
        orderBy: [{ _avg: { rating: 'desc' } }, { _count: { rating: 'desc' } }],
        take: TOP_LIMIT,
    });

    const matchIds = ranking.map((r) => r.matchId);

    // 2. Datos completos de esos partidos (mismo include que la página de inicio)
    const rawMatches = matchIds.length
        ? await prisma.match.findMany({
            where: { id: { in: matchIds } },
            include: {
                homeTeam: true,
                awayTeam: true,
                competition: true,
                reviews: { select: { rating: true } },
                _count: { select: { reviews: true } },
            },
        })
        : [];

    // 3. Respetar el orden del ranking y calcular el promedio
    const matches = matchIds
        .map((id) => rawMatches.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .map((match) => {
            const total = match.reviews.reduce((acc, r) => acc + r.rating, 0);
            const averageRating = match.reviews.length > 0 ? total / match.reviews.length : null;
            return { ...match, averageRating };
        });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Encabezado */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <Flame className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Top Partidos
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Los partidos mejor calificados por la comunidad.
                    </p>
                </div>
            </div>

            {/* Listado */}
            {matches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {matches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-sm space-y-3">
                    <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-base font-semibold text-slate-300">
                        Aún no hay partidos calificados.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-full text-sm transition-all"
                    >
                        Explorar partidos
                    </Link>
                </div>
            )}
        </div>
    );
}