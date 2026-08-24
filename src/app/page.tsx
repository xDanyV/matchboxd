import { prisma } from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import MatchCard from '@/components/matches/MatchCard';
import { Flame, Sparkles } from 'lucide-react';

export const revalidate = 0;

export default async function HomePage() {
  const rawMatches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      competition: true,
      reviews: {
        select: {
          rating: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  const matches = rawMatches.map((match) => {
    const totalRating = match.reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = match.reviews.length > 0 ? totalRating / match.reviews.length : null;

    return {
      ...match,
      averageRating,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 space-y-8 sm:space-y-10">

        {/* Banner Hero */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 lg:p-12 text-center space-y-3 sm:space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reviews de Fútbol Histórico</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto leading-tight">
            Descubre, califica y debate los <span className="text-emerald-400">partidos legendarios</span> del fútbol.
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Registra los partidos que has visto, vota por el MVP y encuentra las mejores recomendaciones de la comunidad en <strong>Matchbox</strong>.
          </p>
        </section>

        {/* Listado de Partidos */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-sans">
                Partidos Destacados & Históricos
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {matches.length} partidos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}