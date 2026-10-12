import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import MatchCard from '@/components/matches/MatchCard';
import { Flame, Sparkles, Calendar, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 0;

const PAGE_SIZE = 6; // 6 partidos por página en tarjetas grandes

interface HomePageProps {
  searchParams: Promise<{ season?: string; page?: string }>;
}

/* ----------------------------- Skeleton ----------------------------- */

function MatchesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-64 rounded bg-slate-800/80" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-3xl bg-slate-900/60 border border-slate-800/80"
          />
        ))}
      </div>
      <div className="h-10 border-t border-slate-800/80 pt-6" />
    </div>
  );
}

/* ------------------- Sección de partidos (async) -------------------- */

async function MatchesSection({
  season,
  currentPage,
}: {
  season: string;
  currentPage: number;
}) {
  const [totalMatchesCount, rawMatches] = await Promise.all([
    prisma.match.count({ where: { season } }),
    prisma.match.findMany({
      where: { season },
      include: {
        homeTeam: true,
        awayTeam: true,
        competition: true,
        reviews: { select: { rating: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { date: 'desc' },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(totalMatchesCount / PAGE_SIZE) || 1;

  const matches = rawMatches.map((match) => {
    const totalRating = match.reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating =
      match.reviews.length > 0 ? totalRating / match.reviews.length : null;

    return { ...match, averageRating };
  });

  return (
    <div className="space-y-8">
      <p className="text-xs sm:text-sm text-slate-400 px-2">
        {totalMatchesCount}{' '}
        {totalMatchesCount === 1 ? 'partido registrado' : 'partidos registrados'} en la
        temporada {season}
      </p>

      {/* Grilla de Tarjetas */}
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
            No hay partidos registrados para la temporada {season}.
          </p>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-6 px-2">
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Página <span className="text-white font-bold">{currentPage}</span> de{' '}
            <span className="text-white font-bold">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            {/* Botón Previo */}
            {currentPage > 1 ? (
              <Link
                href={`/?season=${season}&page=${currentPage - 1}`}
                scroll={false}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-600 text-xs font-bold cursor-not-allowed opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            {/* Botón Siguiente */}
            {currentPage < totalPages ? (
              <Link
                href={`/?season=${season}&page=${currentPage + 1}`}
                scroll={false}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold active:scale-95"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-600 text-xs font-bold cursor-not-allowed opacity-50"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Página ------------------------------ */

export default async function HomePage({ searchParams }: HomePageProps) {
  const { season, page } = await searchParams;

  const parsedPage = parseInt(page || '1', 10);
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  // Temporadas distintas (consulta liviana, necesaria para el selector)
  const seasonsData = await prisma.match.findMany({
    select: { season: true },
    distinct: ['season'],
    orderBy: { season: 'desc' },
  });
  const availableSeasons = seasonsData.map((s) => s.season);

  const currentSeason = season || availableSeasons[0] || '2024-2025';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 space-y-10 sm:space-y-14">

        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 shadow-2xl bg-slate-900">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1600&auto=format&fit=crop"
              alt="Estadio de fútbol"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-20 scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/30" />
          </div>

          <div className="relative z-10 p-6 sm:p-12 lg:p-16 text-center space-y-4 sm:space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-inner">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Reviews de Fútbol Histórico & Actual</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Descubre, califica y debate los{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                partidos legendarios
              </span>{' '}
              del fútbol.
            </h1>

            <p className="text-slate-300 text-xs sm:text-base max-w-2xl mx-auto leading-relaxed">
              Registra los partidos que has visto, vota por el MVP con alineaciones oficiales y
              encuentra las mejores recomendaciones de la comunidad en{' '}
              <strong className="text-white">Matchbox</strong>.
            </p>
          </div>
        </section>

        {/* Sección Principal de Partidos */}
        <section className="space-y-8">

          {/* Header de la Sección & Selector de Temporadas */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 rounded-3xl backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Explorar Partidos
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Temporada {currentSeason}
                </p>
              </div>
            </div>

            {/* Selector Estilizado de Temporadas */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:inline mr-1">
                Temporada:
              </span>
              {availableSeasons.map((s) => {
                const isActive = s === currentSeason;
                return (
                  <Link
                    key={s}
                    href={`/?season=${s}&page=1`}
                    scroll={false}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/50 scale-102'
                        : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                  >
                    <Calendar
                      className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-500'}`}
                    />
                    <span>{s}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Grilla + paginación: solo esta zona se "refresca" al navegar */}
          <Suspense
            key={`${currentSeason}-${currentPage}`}
            fallback={<MatchesSkeleton />}
          >
            <MatchesSection season={currentSeason} currentPage={currentPage} />
          </Suspense>

        </section>
      </main>
    </div>
  );
}