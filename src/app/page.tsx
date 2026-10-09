import { prisma } from '@/lib/prisma';
import MatchCard from '@/components/matches/MatchCard';
import { Flame, Sparkles, Calendar } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

interface HomePageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { season } = await searchParams;

  // 1. Obtener todas las temporadas distintas registradas en la BD
  const seasonsData = await prisma.match.findMany({
    select: { season: true },
    distinct: ['season'],
    orderBy: { season: 'desc' },
  });
  const availableSeasons = seasonsData.map((s) => s.season);

  // Temporada seleccionada por defecto (la más reciente)
  const currentSeason = season || availableSeasons[0] || '2025-2026';

  // 2. Traer los partidos pertenecientes a la temporada seleccionada
  const rawMatches = await prisma.match.findMany({
    where: {
      season: currentSeason,
    },
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 space-y-8 sm:space-y-10">

        {/* Banner Hero */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 lg:p-12 text-center space-y-3 sm:space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reviews de Fútbol Histórico & Actual</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto leading-tight">
            Descubre, califica y debate los <span className="text-emerald-400">partidos legendarios</span> del fútbol.
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Registra los partidos que has visto, vota por el MVP y encuentra las mejores recomendaciones de la comunidad en <strong>Matchbox</strong>.
          </p>
        </section>

        {/* Listado y Filtro por Temporada */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-sans">
                Explorar Partidos
              </h2>
              <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold ml-2">
                {matches.length} partidos
              </span>
            </div>

            {/* Pestañas / Filtros de Temporada */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <Calendar className="w-4 h-4 text-slate-500 mr-1 shrink-0" />
              {availableSeasons.map((s) => {
                const isActive = s === currentSeason;
                return (
                  <Link
                    key={s}
                    href={`/?season=${s}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                  >
                    Temporada {s}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Grilla de Partidos */}
          {matches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              No hay partidos registrados para la temporada {currentSeason}.
            </div>
          )}
        </section>

      </main>
    </div>
  );
}