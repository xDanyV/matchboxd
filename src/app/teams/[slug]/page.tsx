import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Flame,
    Globe,
    History,
    MapPin,
    MessageSquare,
    Trophy,
    User,
    Users,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import MatchCard from '@/components/matches/MatchCard';
import TeamCrest from '@/components/teams/TeamCrest';

export const revalidate = 0;

const PAGE_SIZE = 6;
const TOP_LIMIT = 4;

const matchInclude = {
    homeTeam: true,
    awayTeam: true,
    competition: true,
    reviews: { select: { rating: true, tags: true } },
    _count: { select: { reviews: true } },
} satisfies Prisma.MatchInclude;

interface SquadPlayer {
    id: string;
    name: string;
    photoUrl: string | null;
    position: string | null;
    number: number | null;
}

const POSITION_GROUPS = [
    { key: 'Goalkeeper', label: 'Porteros' },
    { key: 'Defender', label: 'Defensas' },
    { key: 'Midfielder', label: 'Mediocampistas' },
    { key: 'Attacker', label: 'Delanteros' },
];

function sortPlayers(players: SquadPlayer[]) {
    return [...players].sort((a, b) => {
        if (a.number !== null && b.number !== null && a.number !== b.number) {
            return a.number - b.number;
        }
        if (a.number !== null && b.number === null) return -1;
        if (a.number === null && b.number !== null) return 1;
        return a.name.localeCompare(b.name);
    });
}

function groupSquad(players: SquadPlayer[]) {
    const knownKeys = new Set(POSITION_GROUPS.map((g) => g.key));

    const groups = POSITION_GROUPS.map((g) => ({
        label: g.label,
        players: players.filter((p) => p.position === g.key),
    }));

    const others = players.filter((p) => !p.position || !knownKeys.has(p.position));
    if (others.length > 0) groups.push({ label: 'Otros', players: others });

    return groups
        .filter((g) => g.players.length > 0)
        .map((g) => ({ ...g, players: sortPlayers(g.players) }));
}

interface TeamPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ season?: string; page?: string }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
    const { slug } = await params;
    const team = await prisma.team.findUnique({ where: { slug }, select: { name: true } });

    return { title: team ? `${team.name} | Matchbox` : 'Equipo no encontrado | Matchbox' };
}

function withAverage<T extends { reviews: { rating: number }[] }>(match: T) {
    const total = match.reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
        ...match,
        averageRating: match.reviews.length > 0 ? total / match.reviews.length : null,
    };
}

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
    const { slug } = await params;
    const { season, page } = await searchParams;

    const team = await prisma.team.findUnique({
        where: { slug },
        include: {
            _count: { select: { fans: true } },
            players: {
                select: { id: true, name: true, photoUrl: true, position: true, number: true },
            },
        },
    });

    if (!team) notFound();

    // Partidos en los que el equipo fue local o visitante
    const teamMatchFilter = {
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    } satisfies Prisma.MatchWhereInput;

    // Temporadas disponibles para este equipo
    const seasonsData = await prisma.match.findMany({
        where: teamMatchFilter,
        select: { season: true },
        distinct: ['season'],
        orderBy: { season: 'desc' },
    });
    const seasons = seasonsData.map((s) => s.season);
    const activeSeason = season && seasons.includes(season) ? season : null;

    const parsedPage = parseInt(page || '1', 10);
    const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const historyWhere: Prisma.MatchWhereInput = {
        ...teamMatchFilter,
        ...(activeSeason ? { season: activeSeason } : {}),
    };

    const [totalMatches, totalReviews, historyCount, ranking, historyRaw] = await Promise.all([
        prisma.match.count({ where: teamMatchFilter }),
        prisma.review.count({ where: { match: teamMatchFilter } }),
        prisma.match.count({ where: historyWhere }),
        prisma.review.groupBy({
            by: ['matchId'],
            where: { match: teamMatchFilter },
            _avg: { rating: true },
            _count: { rating: true },
            orderBy: [{ _avg: { rating: 'desc' } }, { _count: { rating: 'desc' } }],
            take: TOP_LIMIT,
        }),
        prisma.match.findMany({
            where: historyWhere,
            include: matchInclude,
            orderBy: { date: 'desc' },
            skip: (currentPage - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
    ]);

    // Mejores partidos: respetar el orden del ranking
    const topIds = ranking.map((r) => r.matchId);
    const topRaw = topIds.length
        ? await prisma.match.findMany({ where: { id: { in: topIds } }, include: matchInclude })
        : [];

    const topMatches = topIds
        .map((id) => topRaw.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .map(withAverage);

    const history = historyRaw.map(withAverage);
    const totalPages = Math.ceil(historyCount / PAGE_SIZE) || 1;
    const squadGroups = groupSquad(team.players);

    const buildHref = (s: string | null, p: number) => {
        const query = new URLSearchParams();
        if (s) query.set('season', s);
        if (p > 1) query.set('page', String(p));
        const qs = query.toString();
        return `/teams/${team.slug}${qs ? `?${qs}` : ''}#historial`;
    };

    const numberFormatter = new Intl.NumberFormat('es-MX');
    const venueLocation = [team.venueCity, team.country].filter(Boolean).join(', ');

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            {/* Cabecera del equipo */}
            <section className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-sm shadow-xl">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 text-center sm:text-left">
                    <TeamCrest
                        name={team.name}
                        crestUrl={team.crestUrl}
                        size={112}
                        className="rounded-3xl"
                    />

                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="space-y-1.5">
                            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                {team.name}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-slate-400">
                                {team.country && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Globe className="w-4 h-4 text-slate-500" />
                                        {team.country}
                                    </span>
                                )}
                                {team.venueName && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-slate-500" />
                                        {team.venueName}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-semibold">
                            {team.founded && (
                                <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                    Fundado en {team.founded}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300">
                                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                                {totalMatches} {totalMatches === 1 ? 'partido' : 'partidos'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                {totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300">
                                <Users className="w-3.5 h-3.5 text-emerald-400" />
                                {team._count.fans} {team._count.fans === 1 ? 'hincha' : 'hinchas'} en Matchbox
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Estadio */}
            {team.venueName && (
                <section className="overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-5">
                    {team.venueImageUrl && (
                        <div className="relative sm:col-span-2 aspect-video sm:aspect-auto sm:min-h-44 bg-slate-800">
                            <Image
                                src={team.venueImageUrl}
                                alt={team.venueName}
                                fill
                                sizes="(min-width: 640px) 40vw, 100vw"
                                className="object-cover"
                            />
                        </div>
                    )}
                    <div
                        className={`p-6 sm:p-8 flex flex-col justify-center space-y-2 ${team.venueImageUrl ? 'sm:col-span-3' : 'sm:col-span-5'
                            }`}
                    >
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Estadio
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {team.venueName}
                        </h2>
                        <p className="text-sm text-slate-400">
                            {venueLocation}
                            {venueLocation && team.venueCapacity ? ' • ' : ''}
                            {team.venueCapacity
                                ? `Capacidad: ${numberFormatter.format(team.venueCapacity)}`
                                : ''}
                        </p>
                    </div>
                </section>
            )}

            {/* Mejor calificados */}
            {topMatches.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                            <Flame className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                Mejor calificados
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400">
                                Los partidos de {team.name} con mejor nota de la comunidad.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {topMatches.map((match) => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                </section>
            )}

            {/* Plantilla actual */}
            {squadGroups.length > 0 && (
                <section id="plantilla" className="space-y-6 scroll-mt-24">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                Plantilla actual
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400">
                                Según la última sincronización; puede no coincidir con la plantilla de
                                partidos históricos.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {squadGroups.map((group) => (
                            <div key={group.label} className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    {group.label}{' '}
                                    <span className="text-slate-600">({group.players.length})</span>
                                </h3>

                                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {group.players.map((player) => (
                                        <li
                                            key={player.id}
                                            className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3"
                                        >
                                            {player.photoUrl ? (
                                                <Image
                                                    src={player.photoUrl}
                                                    alt={player.name}
                                                    width={44}
                                                    height={44}
                                                    className="w-11 h-11 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">
                                                    {player.name}
                                                </p>
                                                {player.number !== null && (
                                                    <p className="text-xs text-slate-500 font-mono">
                                                        #{player.number}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Historial */}
            <section id="historial" className="space-y-6 scroll-mt-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                Historial
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400">
                                {historyCount} {historyCount === 1 ? 'partido' : 'partidos'}
                                {activeSeason ? ` en la temporada ${activeSeason}` : ' registrados'}
                            </p>
                        </div>
                    </div>

                    {/* Filtro por temporada */}
                    {seasons.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                            <Link
                                href={buildHref(null, 1)}
                                scroll={false}
                                className={`inline-flex items-center px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${!activeSeason
                                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                                    : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                                    }`}
                            >
                                Todas
                            </Link>
                            {seasons.map((s) => {
                                const isActive = s === activeSeason;
                                return (
                                    <Link
                                        key={s}
                                        href={buildHref(s, 1)}
                                        scroll={false}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${isActive
                                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
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
                    )}
                </div>

                {history.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        {history.map((match) => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-sm space-y-3">
                        <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="text-base font-semibold text-slate-300">
                            No hay partidos registrados para este equipo.
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
                            {currentPage > 1 ? (
                                <Link
                                    href={buildHref(activeSeason, currentPage - 1)}
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

                            {currentPage < totalPages ? (
                                <Link
                                    href={buildHref(activeSeason, currentPage + 1)}
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
            </section>
        </div>
    );
}