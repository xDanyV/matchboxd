import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { Calendar, Flame, Globe, MapPin, MessageSquare, Trophy, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import MatchCard from '@/components/matches/MatchCard';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamFloatingHeader from '@/components/teams/TeamFloatingHeader';
import TeamSquadSection from '@/components/teams/TeamSquadSection';
import TeamVenueSection from '@/components/teams/TeamVenueSection';
import TeamHistorySection from '@/components/teams/TeamHistorySection';

export const revalidate = 0;

const PAGE_SIZE = 4;
const TOP_LIMIT = 3;

const matchInclude = {
    homeTeam: true,
    awayTeam: true,
    competition: true,
    reviews: { select: { rating: true, tags: true } },
    _count: { select: { reviews: true } },
} satisfies Prisma.MatchInclude;

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
    return { ...match, averageRating: match.reviews.length > 0 ? total / match.reviews.length : null };
}

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
    const { slug } = await params;
    const { season, page } = await searchParams;

    const team = await prisma.team.findUnique({
        where: { slug },
        include: {
            _count: { select: { fans: true } },
            players: { select: { id: true, name: true, photoUrl: true, position: true, number: true } },
        },
    });

    if (!team) notFound();

    const teamMatchFilter = { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] } satisfies Prisma.MatchWhereInput;

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

    const historyWhere: Prisma.MatchWhereInput = { ...teamMatchFilter, ...(activeSeason ? { season: activeSeason } : {}) };

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

    const topIds = ranking.map((r) => r.matchId);
    const topRaw = topIds.length ? await prisma.match.findMany({ where: { id: { in: topIds } }, include: matchInclude }) : [];
    const topMatches = topIds.map((id) => topRaw.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => Boolean(m)).map(withAverage);

    const history = historyRaw.map(withAverage);
    const totalPages = Math.ceil(historyCount / PAGE_SIZE) || 1;

    const squadGroups = [
        { label: 'Porteros', key: 'Goalkeeper', players: team.players.filter((p) => p.position === 'Goalkeeper') },
        { label: 'Defensas', key: 'Defender', players: team.players.filter((p) => p.position === 'Defender') },
        { label: 'Mediocampistas', key: 'Midfielder', players: team.players.filter((p) => p.position === 'Midfielder') },
        { label: 'Delanteros', key: 'Attacker', players: team.players.filter((p) => p.position === 'Attacker') },
        { label: 'Otros', key: 'Other', players: team.players.filter((p) => !p.position || !['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].includes(p.position)) },
    ].filter((g) => g.players.length > 0);

    const buildHref = (s: string | null, p: number) => {
        const query = new URLSearchParams();
        if (s) query.set('season', s);
        if (p > 1) query.set('page', String(p));
        const qs = query.toString();
        return `/teams/${team.slug}${qs ? `?${qs}` : ''}#historial`;
    };

    return (
        <div className="relative min-h-screen bg-slate-950 flex flex-col text-slate-100 pb-28 overflow-hidden">
            {/* Destellos de colores vibrantes y sutiles inspirados en el equipo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-96 -left-48 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <TeamFloatingHeader teamName={team.name} crestUrl={team.crestUrl} />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 w-full relative z-10 flex-1">
                {/* Cabecera del equipo */}
                <section className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-md shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 text-center sm:text-left">
                        <TeamCrest name={team.name} crestUrl={team.crestUrl} size={112} className="rounded-3xl shadow-lg" />
                        <div className="flex-1 min-w-0 space-y-4">
                            <div className="space-y-1.5">
                                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{team.name}</h1>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-slate-400">
                                    {team.country && <span className="inline-flex items-center gap-1.5"><Globe className="w-4 h-4 text-slate-500" />{team.country}</span>}
                                    {team.venueName && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-500" />{team.venueName}</span>}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-semibold">
                                {team.founded && <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300"><Calendar className="w-3.5 h-3.5 text-emerald-400" />Fundado en {team.founded}</span>}
                                <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300"><Trophy className="w-3.5 h-3.5 text-emerald-400" />{totalMatches} partidos</span>
                                <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300"><MessageSquare className="w-3.5 h-3.5 text-emerald-400" />{totalReviews} reseñas</span>
                                <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-300"><Users className="w-3.5 h-3.5 text-emerald-400" />{team._count.fans} hinchas</span>
                            </div>
                        </div>
                    </div>
                </section>

                <TeamVenueSection venueName={team.venueName} venueCity={team.venueCity} country={team.country} venueCapacity={team.venueCapacity} venueImageUrl={team.venueImageUrl} />

                {topMatches.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0"><Flame className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Mejor calificados</h2>
                                <p className="text-xs sm:text-sm text-slate-400">Los partidos de {team.name} con mejor nota.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {topMatches.map((match) => <MatchCard key={match.id} match={match} />)}
                        </div>
                    </section>
                )}

                {squadGroups.length > 0 && <TeamSquadSection squadGroups={squadGroups} />}

                <TeamHistorySection history={history} historyCount={historyCount} activeSeason={activeSeason} seasons={seasons} currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
            </main>
        </div>
    );
}