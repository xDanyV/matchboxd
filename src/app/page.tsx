import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { classifyStage } from '@/lib/search-params';
import { KNOCKOUT_ROUNDS } from '@/lib/knockout';
import TeamCrest from '@/components/teams/TeamCrest';
import FinalsShowcase, { type LandingFinal } from '@/components/landing/FinalsShowcase';

export const revalidate = 0;

const PAGE_SIZE = 12;

interface HomePageProps {
  searchParams: Promise<{ season?: string; page?: string }>;
}

/* ------------------------- Contenido de las finales ------------------------- */

// Lo que no está en la base: la ciudad, la historia en una línea y la foto con su crédito
const FINAL_EXTRAS: Record<string, Pick<LandingFinal, 'city' | 'story' | 'photo'>> = {
  '2024-2025': {
    city: 'Múnich',
    story:
      'El PSG ganó su primera Champions con la goleada más amplia que ha visto una final: cinco goles sin respuesta en el Allianz Arena.',
    photo: {
      src: '/landing/allianz-arena.jpg',
      alt: 'Allianz Arena desde el aire',
      credit: 'Richard Bartz',
      license: 'CC BY-SA 2.5',
      href: 'https://commons.wikimedia.org/wiki/File:Allianz_arena_daylight_Richard_Bartz.jpg',
    },
  },
  '2023-2024': {
    city: 'Londres',
    story:
      'Dortmund tuvo sus ocasiones en la primera parte; Carvajal y Vinícius resolvieron en la segunda la decimoquinta del Real Madrid.',
    photo: {
      src: '/landing/wembley.jpg',
      alt: 'Estadio de Wembley desde el aire',
      credit: 'Arne Müseler',
      license: 'CC BY-SA 3.0',
      href: 'https://commons.wikimedia.org/wiki/File:London_Wembley.jpg',
    },
  },
  '2022-2023': {
    city: 'Estambul',
    story:
      'Un remate de Rodri al minuto 68 le dio al Manchester City la Champions que llevaba años persiguiendo, y con ella el triplete.',
    photo: {
      src: '/landing/ataturk.jpg',
      alt: 'Estadio Olímpico Atatürk',
      credit: 'Bjørn Christian Tørrissen',
      license: 'CC BY-SA 3.0',
      href: 'https://commons.wikimedia.org/wiki/File:Istanbul_Ataturk_Olympic_Stadium_(cropped).JPG',
    },
  },
};

const formatTicketDate = (date: Date) =>
  date
    .toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    .replaceAll('/', '·');

/** "League Stage - 7" -> "Fase de liga, jornada 7"; "Group B - 1" -> "Grupo B, jornada 1" */
function stageLabel(stage: string | null): string {
  if (!stage) return 'Sin fase';
  const knockout = KNOCKOUT_ROUNDS.find((round) => round.stage === stage);
  if (knockout) return knockout.label === 'Playoff' ? 'Playoff de eliminatorias' : knockout.label;
  const league = stage.match(/^League Stage - (\d+)$/);
  if (league) return `Fase de liga, jornada ${league[1]}`;
  const group = stage.match(/^Group ([A-H]) - (\d+)$/);
  if (group) return `Grupo ${group[1]}, jornada ${group[2]}`;
  return stage;
}

/* --------------------------- Hoja de la temporada --------------------------- */

function SheetSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-11 rounded-lg bg-[var(--paper-2)]" />
      ))}
    </div>
  );
}

async function SeasonSheet({ season, currentPage }: { season: string; currentPage: number }) {
  const [total, matches] = await Promise.all([
    prisma.match.count({ where: { season } }),
    prisma.match.findMany({
      where: { season },
      select: {
        id: true,
        date: true,
        stage: true,
        homeScore: true,
        awayScore: true,
        homePenalties: true,
        awayPenalties: true,
        homeTeam: { select: { name: true, crestUrl: true } },
        awayTeam: { select: { name: true, crestUrl: true } },
      },
      orderBy: { date: 'desc' },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Partidos agrupados por fase, en el orden en que aparecen (más recientes primero)
  const groups: { label: string; rows: typeof matches }[] = [];
  for (const match of matches) {
    const label = stageLabel(match.stage);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(match);
    else groups.push({ label, rows: [match] });
  }

  const pageHref = (page: number) => `/?season=${season}&page=${page}#temporadas`;

  return (
    <div className="space-y-8">
      {groups.length === 0 ? (
        <p className="py-10 text-center text-base">No hay partidos registrados para {season}.</p>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <h3 className="text-base font-black">{group.label}</h3>
            <ul>
              {group.rows.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/matches/${match.id}`}
                    className="-mx-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--paper-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ink)]"
                  >
                    <span className="flex min-w-0 items-center justify-end gap-2 text-right">
                      <span className="truncate text-sm sm:text-base font-semibold">{match.homeTeam.name}</span>
                      <TeamCrest name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} size={22} />
                    </span>
                    <span className="min-w-14 text-center text-base sm:text-lg font-black tabular-nums">
                      {match.homeScore}–{match.awayScore}
                      {match.homePenalties != null && match.awayPenalties != null && (
                        <span className="block text-[11px] font-semibold text-[var(--ink-soft)]">
                          pen. {match.homePenalties}–{match.awayPenalties}
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamCrest name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} size={22} />
                      <span className="truncate text-sm sm:text-base font-semibold">{match.awayTeam.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <nav aria-label="Páginas de la temporada" className="flex items-center justify-between gap-3 pt-2">
        {currentPage > 1 ? (
          <Link
            href={pageHref(currentPage - 1)}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-5 text-sm font-bold text-[var(--paper)] transition-transform active:scale-95 hover:bg-slate-800"
          >
            Anterior
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center rounded-full bg-[var(--paper-2)] px-5 text-sm font-bold text-[var(--ink-soft)]">
            Anterior
          </span>
        )}
        <p className="text-sm font-semibold tabular-nums">
          Hoja {currentPage} de {totalPages}
        </p>
        {currentPage < totalPages ? (
          <Link
            href={pageHref(currentPage + 1)}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-5 text-sm font-bold text-[var(--paper)] transition-transform active:scale-95 hover:bg-slate-800"
          >
            Siguiente
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center rounded-full bg-[var(--paper-2)] px-5 text-sm font-bold text-[var(--ink-soft)]">
            Siguiente
          </span>
        )}
      </nav>
    </div>
  );
}

/* ---------------------------------- Página ---------------------------------- */

const FOLDERS = [
  { href: '#finales', label: 'Finales', tone: 'bg-slate-800 text-slate-100' },
  { href: '#como-funciona', label: 'Cómo funciona', tone: 'bg-slate-700 text-white' },
  { href: '#recibo', label: 'El archivo', tone: 'bg-emerald-900 text-emerald-50' },
  { href: '#temporadas', label: 'Temporadas', tone: 'bg-emerald-700 text-white' },
];

const STEPS = [
  { what: 'Busca el partido', value: 'por equipo o jugador' },
  { what: 'Califícalo', value: 'de 0.5 a 10' },
  { what: 'Reséñalo', value: '5 000 caracteres' },
  { what: 'Vota al MVP', value: 'un voto por partido' },
  { what: 'Dónde lo viste', value: 'estadio o tele' },
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const { season, page } = await searchParams;

  const parsedPage = parseInt(page || '1', 10);
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const [session, stageCounts, finalsRaw] = await Promise.all([
    getSession(),
    prisma.match.groupBy({ by: ['season', 'stage'], _count: true }),
    prisma.match.findMany({
      where: { stage: 'Final' },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        season: true,
        date: true,
        stadium: true,
        homeScore: true,
        awayScore: true,
        homeTeam: { select: { name: true, crestUrl: true } },
        awayTeam: { select: { name: true, crestUrl: true } },
        players: {
          where: { rating: { not: null } },
          orderBy: { rating: 'desc' },
          take: 1,
          select: { rating: true, player: { select: { name: true } } },
        },
      },
    }),
  ]);

  // Recibo: partidos por temporada, separando fase regular y eliminatorias
  const receipt = new Map<string, { regular: number; knockout: number }>();
  for (const row of stageCounts) {
    const entry = receipt.get(row.season) ?? { regular: 0, knockout: 0 };
    if (classifyStage(row.stage) === 'groups') entry.regular += row._count;
    else entry.knockout += row._count;
    receipt.set(row.season, entry);
  }
  const seasons = [...receipt.keys()].sort().reverse();
  const totalMatches = stageCounts.reduce((acc, row) => acc + row._count, 0);
  const currentSeason = season && receipt.has(season) ? season : seasons[0] ?? '2024-2025';

  const finals: LandingFinal[] = finalsRaw
    .filter((f) => FINAL_EXTRAS[f.season])
    .map((f) => ({
      id: f.id,
      year: f.season.slice(-4),
      dateLabel: f.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
      stadium: f.stadium ?? 'Final',
      home: f.homeTeam,
      away: f.awayTeam,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      best: f.players[0]?.rating != null ? { name: f.players[0].player.name, rating: f.players[0].rating } : null,
      ...FINAL_EXTRAS[f.season],
    }));
  const latest = finalsRaw[0];

  return (
    <div className="flex min-h-[100svh] flex-col pb-28 text-slate-100">
      <main className="w-full flex-1">
        {/* Portada: el nombre y el archivo como pila de carpetas */}
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <div className="lp-load text-center">
            <h1 className="text-[clamp(3.25rem,13vw,10.5rem)] font-black leading-[0.85] tracking-tighter text-white">
              MATCH<span className="text-emerald-400">BOX</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-200 sm:text-xl" style={{ ['--i' as string]: 1 }}>
              Califica, reseña y guarda en tu diario cada partido de Champions que viste. {totalMatches} partidos en el
              archivo, de 2022 a 2025.
            </p>
          </div>

          <div className="lp-load mt-10 [--tab-step:16%] sm:mt-14 sm:[--tab-step:18.6%]">
            {FOLDERS.map((folder, i) => (
              <a
                key={folder.href}
                href={folder.href}
                style={{ ['--i' as string]: i + 2 }}
                className="group relative -mt-3 block first:mt-0 focus-visible:outline-none"
              >
                <span
                  className={`lp-folder-tab relative z-10 flex h-9 w-[36%] items-center justify-center px-4 text-xs font-bold transition-transform group-hover:-translate-y-1 group-focus-visible:-translate-y-1 sm:h-10 sm:w-[24%] sm:text-sm ${folder.tone}`}
                  style={{ marginLeft: `calc(${i} * var(--tab-step))` }}
                >
                  <span className="truncate group-focus-visible:underline">{folder.label}</span>
                </span>
                <span className={`block h-8 rounded-t-2xl sm:h-10 ${folder.tone}`} />
              </a>
            ))}

            {/* Carpeta delantera, abierta */}
            <div className="relative -mt-3" style={{ ['--i' as string]: 6 }}>
              <span
                className="lp-folder-tab flex h-9 w-[36%] items-center justify-center bg-[var(--paper)] text-xs font-bold text-[var(--ink)] sm:h-10 sm:w-[24%] sm:text-sm"
                style={{ marginLeft: 'calc(4 * var(--tab-step))' }}
              >
                Tu diario
              </span>
              <div className="rounded-b-[1.75rem] rounded-tl-[1.75rem] bg-[var(--paper)] px-5 py-7 text-[var(--ink)] sm:px-10 sm:py-10">
                <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <p className="text-2xl font-black leading-tight sm:text-3xl">Empieza por la última final</p>
                    {latest && (
                      <p className="text-base text-[var(--ink-soft)] sm:text-lg">
                        {latest.homeTeam.name} {latest.homeScore}–{latest.awayScore} {latest.awayTeam.name} ·{' '}
                        {FINAL_EXTRAS[latest.season]?.city ?? latest.stadium}, {formatTicketDate(latest.date)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 min-[420px]:flex-row">
                    <Link
                      href={session?.user ? '/profile' : '/login'}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-700 px-6 text-base font-bold text-white transition-[background-color,transform] hover:bg-emerald-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
                    >
                      {session?.user ? 'Abrir mi diario' : 'Empezar mi diario'}
                    </Link>
                    <a
                      href="#finales"
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-6 text-base font-bold text-[var(--paper)] transition-[background-color,transform] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      Ver las finales
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Las tres finales: talón con foto y la nota en vivo */}
        <section id="finales" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <div className="lp-reveal mb-10 max-w-2xl space-y-3">
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Tres finales, tres talones</h2>
            <p className="text-lg text-slate-300" style={{ ['--i' as string]: 1 }}>
              Elige una, ponle nota y mira cómo queda frente a la mejor nota de los datos del partido.
            </p>
          </div>
          <FinalsShowcase finals={finals} isLoggedIn={Boolean(session?.user)} />
        </section>

        {/* Cómo funciona: un itinerario impreso */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <div className="grid items-start gap-10 md:grid-cols-[1fr_auto] md:gap-16">
            <div className="lp-reveal max-w-md space-y-4 md:pt-8">
              <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Cada partido, una ficha</h2>
              <p className="text-lg leading-relaxed text-slate-300" style={{ ['--i' as string]: 1 }}>
                Lo que viste queda anotado como en un cuaderno de estadio: la nota, lo que pensaste y quién fue el mejor.
                Tu perfil junta todo por temporada.
              </p>
              <Link
                href="/matches"
                style={{ ['--i' as string]: 2 }}
                className="inline-flex min-h-12 items-center rounded-full bg-slate-800 px-6 text-base font-bold text-white transition-[background-color,transform] hover:bg-slate-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Ver los mejor calificados
              </Link>
            </div>

            <div className="lp-zigzag w-full bg-[var(--paper)] px-6 pb-12 pt-8 text-[var(--ink)] md:w-[460px]">
              <p className="text-center text-lg font-black">Matchbox · ficha del partido</p>
              <ol className="lp-reveal mt-6 space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step.what} className="flex flex-wrap items-baseline gap-x-3 text-base" style={{ ['--i' as string]: i }}>
                    <span className="whitespace-nowrap font-bold">{step.what}</span>
                    <span className="lp-leader" aria-hidden />
                    <span className="ml-auto text-right text-[var(--ink-soft)]">{step.value}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 flex items-baseline gap-3 rounded-xl bg-[var(--ink)] px-4 py-3 text-base text-[var(--paper)]">
                <span className="font-bold">Queda en tu diario</span>
                <span className="lp-leader" aria-hidden />
                <span className="font-black">con fecha</span>
              </p>
            </div>
          </div>
        </section>

        {/* El total y su recibo */}
        <section id="recibo" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="lp-reveal">
              <p className="text-[clamp(7rem,26vw,16rem)] font-black leading-[0.8] tracking-tighter text-emerald-400 tabular-nums">
                {totalMatches}
              </p>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl" style={{ ['--i' as string]: 1 }}>
                Partidos en el archivo
              </h2>
              <p className="mt-3 max-w-md text-lg text-slate-300" style={{ ['--i' as string]: 2 }}>
                Todas las jornadas y eliminatorias de tres temporadas, con alineaciones, eventos y estadísticas que se
                actualizan cada día.
              </p>
            </div>

            <div className="lp-zigzag bg-[var(--paper)] px-6 pb-12 pt-8 text-[var(--ink)]">
              <p className="text-center text-lg font-black">Recibo del archivo</p>
              <ul className="lp-reveal mt-6 space-y-5">
                {seasons.map((s, i) => {
                  const entry = receipt.get(s)!;
                  const regularLabel = s >= '2024-2025' ? 'Fase de liga' : 'Fase de grupos';
                  return (
                    <li key={s} style={{ ['--i' as string]: i }} className="space-y-1">
                      <Link
                        href={`/competitions/uefa-champions-league?season=${s}`}
                        className="text-base font-black underline-offset-4 hover:underline"
                      >
                        Temporada {s.replace('-', '/')}
                      </Link>
                      <p className="flex items-baseline gap-3 text-base">
                        <span>{regularLabel}</span>
                        <span className="lp-leader" aria-hidden />
                        <span className="font-bold tabular-nums">{entry.regular}</span>
                      </p>
                      <p className="flex items-baseline gap-3 text-base">
                        <span>Eliminatorias</span>
                        <span className="lp-leader" aria-hidden />
                        <span className="font-bold tabular-nums">{entry.knockout}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-6 flex items-baseline gap-3 rounded-xl bg-[var(--ink)] px-4 py-3 text-lg text-[var(--paper)]">
                <span className="font-bold">Total</span>
                <span className="lp-leader" aria-hidden />
                <span className="font-black tabular-nums">{totalMatches}</span>
              </p>
            </div>
          </div>
        </section>

        {/* La temporada como hoja impresa */}
        <section id="temporadas" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <div className="lp-reveal mx-auto mb-8 max-w-2xl space-y-3 text-center">
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">La temporada, partido a partido</h2>
            <p className="text-lg text-slate-300" style={{ ['--i' as string]: 1 }}>
              Del más reciente al primero. Toca cualquier marcador para abrir el partido.
            </p>
          </div>

          <div className="mx-auto max-w-[640px] rounded-[1.75rem] bg-[var(--paper)] text-[var(--ink)]">
            <div className="px-5 pt-6 sm:px-8 sm:pt-8">
              <p className="text-center text-2xl font-black">Champions League {currentSeason.replace('-', '/')}</p>
              <div role="group" aria-label="Elegir temporada" className="mt-5 flex flex-wrap justify-center gap-2">
                {seasons.map((s) => {
                  const isActive = s === currentSeason;
                  return (
                    <Link
                      key={s}
                      href={`/?season=${s}&page=1#temporadas`}
                      scroll={false}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition-[background-color,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ink)] ${isActive
                        ? 'bg-[var(--ink)] text-[var(--paper)]'
                        : 'bg-[var(--paper-2)] text-[var(--ink)] hover:bg-[#d6cfbd]'
                        }`}
                    >
                      {s.replace('-', '/')}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="lp-perforated mx-5 mt-6 sm:mx-8" aria-hidden />
            <div className="px-5 pb-7 pt-6 sm:px-8 sm:pb-9">
              <Suspense key={`${currentSeason}-${currentPage}`} fallback={<SheetSkeleton />}>
                <SeasonSheet season={currentSeason} currentPage={currentPage} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Cierre: una frase con un espacio en blanco */}
        <section id="buscar" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-8 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <form action="/search" method="get" className="lp-reveal mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              <label htmlFor="landing-search">Quiero volver a ver</label>
            </h2>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end" style={{ ['--i' as string]: 1 }}>
              <input
                id="landing-search"
                name="q"
                type="search"
                required
                maxLength={80}
                placeholder="el Madrid contra el City"
                className="min-h-14 flex-1 border-b-4 border-emerald-400 bg-transparent px-1 text-2xl font-bold text-white placeholder:text-slate-500 focus:border-white focus:outline-none sm:text-4xl"
              />
              <button
                type="submit"
                className="min-h-14 rounded-full bg-emerald-400 px-8 text-lg font-black text-slate-950 transition-[background-color,transform] hover:bg-emerald-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Buscar
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
