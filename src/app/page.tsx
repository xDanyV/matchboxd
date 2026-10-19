import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import MatchCard from '@/components/matches/MatchCard';
import { Flame, Calendar, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 0;

const PAGE_SIZE = 6;

interface HomePageProps {
  searchParams: Promise<{ season?: string; page?: string }>;
}

/* ----------------------------- Skeleton ----------------------------- */

function MatchesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-72 rounded bg-slate-800/80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div
            key={i}
            className="h-[21rem] rounded-[1.5rem] bg-slate-900/70"
          />
        ))}
      </div>
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
    <div className="space-y-6">
      <p className="px-1 text-sm sm:text-base text-slate-300">
        {totalMatchesCount}{' '}
        {totalMatchesCount === 1 ? 'partido registrado' : 'partidos registrados'} en la
        temporada {season}
      </p>

      {/* Grilla de Tarjetas */}
      {matches.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] bg-slate-900/60 px-6 py-20 text-center text-slate-300 space-y-4">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
          <p className="text-lg sm:text-xl font-semibold">
            No hay partidos registrados para la temporada {season}.
          </p>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-2">
          <p className="text-sm text-slate-300 font-medium">
            Página <span className="text-white font-bold">{currentPage}</span> de{' '}
            <span className="text-white font-bold">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            {/* Botón Previo */}
            {currentPage > 1 ? (
              <Link
                href={`/?season=${season}&page=${currentPage - 1}`}
                scroll={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900/40 px-4 py-2 text-sm font-bold text-slate-400 cursor-not-allowed"
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
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900/40 px-4 py-2 text-sm font-bold text-slate-600 cursor-not-allowed"
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
    <div className="flex min-h-[100svh] flex-col text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-6 sm:gap-14 sm:px-6 sm:py-10 lg:px-8">
        <section className="grid overflow-hidden rounded-[2rem] bg-slate-900 md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-h-[300px] flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
            <h1 className="max-w-xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-7xl">
              El fútbol no se olvida
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Explora encuentros históricos, revive cada jugada y comparte lo que hizo especial
              cada noche de fútbol en <strong className="font-bold text-white">Matchbox</strong>.
            </p>
          </div>
          <div className="relative min-h-[220px] overflow-hidden bg-slate-800 md:min-h-[340px]">
            <Image
              src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1600&auto=format&fit=crop"
              alt="Tribunas de un estadio de fútbol iluminadas durante un partido"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 45vw"
              className="object-cover object-center opacity-80 transition-transform duration-700 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
            />
            <div className="absolute inset-0 bg-slate-950/20" />
          </div>
        </section>

        <section className="space-y-7 sm:space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Flame className="h-7 w-7 shrink-0 fill-amber-400/20 text-amber-400" />
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Explorar partidos
                </h2>
              </div>
            </div>

            <div
              role="group"
              aria-label="Seleccionar temporada"
              className="flex flex-wrap gap-2"
            >
              {availableSeasons.map((s) => {
                const isActive = s === currentSeason;
                return (
                  <Link
                    key={s}
                    href={`/?season=${s}&page=1`}
                    scroll={false}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${isActive
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Calendar
                      className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`}
                    />
                    <span>{s}</span>
                  </Link>
                );
              })}
            </div>
          </div>

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