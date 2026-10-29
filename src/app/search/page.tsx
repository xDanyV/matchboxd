import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, Info, Search, SearchX, Trophy, User, X } from 'lucide-react';
import Image from 'next/image';
import { playerHref } from '@/lib/players';
import MatchCard from '@/components/matches/MatchCard';
import SearchFilters from '@/components/search/SearchFilters';
import TeamCrest from '@/components/teams/TeamCrest';
import {
    findTeams,
    getSearchDimensions,
    getStageOptions,
    searchMatches,
    searchPlayers,
} from '@/lib/search';
import {
    STAGE_CATEGORIES,
    buildSearchHref,
    parseSearchParams,
    tokenize,
    type RawSearchParams,
    type SearchCriteria,
} from '@/lib/search-params';

interface SearchPageProps {
    searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
    const raw = await searchParams;
    const value = Array.isArray(raw.q) ? raw.q[0] : raw.q;
    const q = value?.trim().slice(0, 60);

    return { title: q ? `«${q}» – Buscar | Matchbox` : 'Buscar | Matchbox' };
}

function ratingLabel(min: number | null, max: number | null) {
    if (min !== null && max !== null) return min === max ? `Rating ${min}` : `Rating ${min}–${max}`;
    if (min !== null) return `Rating ≥ ${min}`;
    return `Rating ≤ ${max}`;
}

function ResultsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-5 w-48 rounded bg-slate-800/80" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-64 rounded-3xl bg-slate-900/60 border border-slate-800/80"
                    />
                ))}
            </div>
        </div>
    );
}

function Pagination({
    criteria,
    page,
    totalPages,
}: {
    criteria: SearchCriteria;
    page: number;
    totalPages: number;
}) {
    if (totalPages <= 1) return null;

    const hrefFor = (target: number) => `${buildSearchHref(criteria, { page: target })}#resultados`;

    const enabled =
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold active:scale-95';
    const disabled =
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-600 text-xs font-bold cursor-not-allowed opacity-50';

    return (
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-6 px-2 pb-28">
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Página <span className="text-white font-bold">{page}</span> de{' '}
                <span className="text-white font-bold">{totalPages}</span>
            </p>

            <div className="flex items-center gap-2">
                {page > 1 ? (
                    <Link href={hrefFor(page - 1)} className={enabled}>
                        <ChevronLeft className="w-4 h-4" />
                        <span>Anterior</span>
                    </Link>
                ) : (
                    <button disabled className={disabled}>
                        <ChevronLeft className="w-4 h-4" />
                        <span>Anterior</span>
                    </button>
                )}

                {page < totalPages ? (
                    <Link href={hrefFor(page + 1)} className={enabled}>
                        <span>Siguiente</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                ) : (
                    <button disabled className={disabled}>
                        <span>Siguiente</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

async function SearchResults({ criteria }: { criteria: SearchCriteria }) {
    const dims = await getSearchDimensions();

    // Los equipos dependen solo del texto y se muestran en la primera página
    const teams = criteria.page === 1 ? findTeams(tokenize(criteria.q), dims, 8) : [];
    const [result, players] = await Promise.all([
        searchMatches(criteria, dims),
        criteria.page === 1 && criteria.q ? searchPlayers(criteria.q, 8) : Promise.resolve([]),
    ]);

    const hasFilters =
        criteria.season !== null ||
        criteria.stage !== null ||
        criteria.min !== null ||
        criteria.max !== null;

    return (
        <div className="space-y-10">
            {/* Equipos */}
            {teams.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white tracking-tight">
                        Equipos <span className="text-slate-500 font-bold">({teams.length})</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {teams.map((team) => (
                            <Link
                                key={team.id}
                                href={`/teams/${team.slug}`}
                                className="group flex items-center gap-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 p-4 transition-all"
                            >
                                <TeamCrest name={team.name} crestUrl={team.crestUrl} size={44} />
                                <div className="min-w-0">
                                    <p className="truncate font-black text-white group-hover:text-emerald-400 transition-colors">
                                        {team.name}
                                    </p>
                                    {team.country && (
                                        <p className="truncate text-xs text-slate-500">{team.country}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Jugadores */}
            {players.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white tracking-tight">
                        Jugadores <span className="text-slate-500 font-bold">({players.length})</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {players.map((player) => (
                            <Link
                                key={player.id}
                                href={playerHref(player.id)}
                                className="group flex items-center gap-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 p-4 transition-all"
                            >
                                <span className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                                    {player.photoUrl ? (
                                        <Image src={player.photoUrl} alt="" fill sizes="44px" className="object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-500 absolute inset-0 m-auto" />
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-black text-white group-hover:text-emerald-400 transition-colors">
                                        {player.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {[player.teamName, player.appearances > 0 ? `${player.appearances} PJ` : null].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Partidos */}
            <section id="resultados" className="space-y-6 scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-white tracking-tight">
                        Partidos{' '}
                        <span className="text-slate-500 font-bold">
                            ({result.total} {result.total === 1 ? 'resultado' : 'resultados'})
                        </span>
                    </h2>

                    {result.ratingMode && (
                        <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <Info className="w-3.5 h-3.5 text-slate-500" />
                            Con rating solo se muestran partidos con reseñas.
                        </p>
                    )}
                </div>

                {result.matches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        {result.matches.map((match) => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-sm space-y-3">
                        <SearchX className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="text-base font-semibold text-slate-300">
                            No encontramos partidos con esa búsqueda.
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Prueba con menos palabras, revisa la ortografía o quita algún filtro.
                        </p>
                        {(hasFilters || criteria.q) && (
                            <Link
                                href="/search"
                                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-full text-sm transition-all"
                            >
                                Limpiar búsqueda
                            </Link>
                        )}
                    </div>
                )}

                <Pagination criteria={criteria} page={result.page} totalPages={result.totalPages} />
            </section>
        </div>
    );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const raw = await searchParams;
    const dims = await getSearchDimensions();

    const criteria = parseSearchParams(raw, dims.seasons);
    const stageOptions = getStageOptions(dims, criteria.season);

    // Chips de filtros activos, cada uno con su enlace para quitarlo
    const chips: { key: string; label: string; href: string }[] = [];

    if (criteria.season) {
        chips.push({
            key: 'season',
            label: `Temporada ${criteria.season}`,
            href: buildSearchHref(criteria, { season: null, page: 1 }),
        });
    }
    if (criteria.stage) {
        chips.push({
            key: 'stage',
            label: STAGE_CATEGORIES.find((c) => c.key === criteria.stage)?.label ?? 'Fase',
            href: buildSearchHref(criteria, { stage: null, page: 1 }),
        });
    }
    if (criteria.min !== null || criteria.max !== null) {
        chips.push({
            key: 'rating',
            label: ratingLabel(criteria.min, criteria.max),
            href: buildSearchHref(criteria, { min: null, max: null, page: 1 }),
        });
    }

    const { page: _page, ...filterState } = criteria;
    void _page;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <Search className="w-7 h-7 text-emerald-400" />
                    Buscar
                </h1>
                <p className="text-sm text-slate-400">
                    {criteria.q
                        ? `Resultados para «${criteria.q}»`
                        : 'Encuentra equipos y partidos y filtra por temporada, fase y rating.'}
                </p>
            </div>

            <SearchFilters initial={filterState} seasons={dims.seasons} stageOptions={stageOptions} />

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {chips.map((chip) => (
                        <Link
                            key={chip.key}
                            href={chip.href}
                            aria-label={`Quitar filtro: ${chip.label}`}
                            className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                        >
                            <Trophy className="w-3 h-3" />
                            {chip.label}
                            <X className="w-3 h-3" />
                        </Link>
                    ))}

                    <Link
                        href={buildSearchHref({ q: criteria.q })}
                        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors px-2"
                    >
                        Limpiar filtros
                    </Link>
                </div>
            )}

            <Suspense key={JSON.stringify(criteria)} fallback={<ResultsSkeleton />}>
                <SearchResults criteria={criteria} />
            </Suspense>
        </div>
    );
}