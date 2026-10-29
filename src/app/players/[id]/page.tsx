import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Award, CalendarDays, Clock, Goal, Handshake, ListOrdered, Sparkles, Star, User } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { playerIdFromParam, positionLabel } from '@/lib/players';
import type { PlayerMatchStats } from '@/lib/match-stats';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';
import RatingBadge from '@/components/matches/RatingBadge';

export const revalidate = 0;

interface PlayerPageProps {
    params: Promise<{ id: string }>;
}

async function findPlayer(param: string) {
    const id = playerIdFromParam(param);
    if (!id) return null;
    return prisma.player.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            photoUrl: true,
            position: true,
            number: true,
            team: { select: { name: true, slug: true, crestUrl: true } },
        },
    });
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
    const { id } = await params;
    const player = await findPlayer(id);
    if (!player) return { title: 'Jugador no encontrado | Matchbox' };
    return {
        title: `${player.name}: estadísticas y partidos | Matchbox`,
        description: `Partidos, goles, asistencias, notas y votos al MVP de ${player.name} en Matchbox.`,
    };
}

const teamSelect = { select: { id: true, name: true, shortName: true, slug: true, crestUrl: true } } as const;

export default async function PlayerPage({ params }: PlayerPageProps) {
    const { id } = await params;
    const player = await findPlayer(id);
    if (!player) notFound();

    const [appearances, votes] = await Promise.all([
        prisma.matchPlayer.findMany({
            where: { playerId: player.id },
            include: {
                team: teamSelect,
                match: {
                    select: {
                        id: true, date: true, season: true, stage: true, homeScore: true, awayScore: true,
                        homeTeamId: true, homeTeam: teamSelect, awayTeam: teamSelect,
                    },
                },
            },
            orderBy: { match: { date: 'desc' } },
        }),
        prisma.mvpVote.groupBy({ by: ['matchId'], where: { playerId: player.id }, _count: true }),
    ]);

    // Partidos en los que fue el más votado como MVP por la comunidad (empates incluidos)
    const votedMatchIds = votes.map((v) => v.matchId);
    const matchTotals = votedMatchIds.length
        ? await prisma.mvpVote.groupBy({ by: ['matchId', 'playerId'], where: { matchId: { in: votedMatchIds } }, _count: true })
        : [];
    const topByMatch = new Map<string, number>();
    for (const row of matchTotals) topByMatch.set(row.matchId, Math.max(topByMatch.get(row.matchId) ?? 0, row._count));
    const communityMvpMatches = new Set(votes.filter((v) => v._count === topByMatch.get(v.matchId)).map((v) => v.matchId));
    const totalVotes = votes.reduce((acc, v) => acc + v._count, 0);

    const played = appearances.filter((a) => a.isStarter || (a.minutes ?? 0) > 0);
    const statsOf = (a: (typeof appearances)[number]) => (a.stats ?? {}) as PlayerMatchStats;
    const sum = (list: typeof played, pick: (s: PlayerMatchStats) => number | undefined) =>
        list.reduce((acc, a) => acc + (pick(statsOf(a)) ?? 0), 0);
    const average = (list: typeof played) => {
        const rated = list.filter((a) => a.rating !== null);
        return rated.length ? rated.reduce((acc, a) => acc + a.rating!, 0) / rated.length : null;
    };

    const totals = {
        matches: played.length,
        starts: played.filter((a) => a.isStarter).length,
        minutes: played.reduce((acc, a) => acc + (a.minutes ?? 0), 0),
        goals: sum(played, (s) => s.goals),
        assists: sum(played, (s) => s.assists),
        rating: average(played),
    };

    // Desglose por temporada (de la más reciente a la más antigua, como viene ordenado)
    const seasons = [...new Set(played.map((a) => a.match.season))].map((season) => {
        const list = played.filter((a) => a.match.season === season);
        return {
            season,
            matches: list.length,
            minutes: list.reduce((acc, a) => acc + (a.minutes ?? 0), 0),
            goals: sum(list, (s) => s.goals),
            assists: sum(list, (s) => s.assists),
            yellow: sum(list, (s) => s.yellowCards),
            red: sum(list, (s) => s.redCards),
            rating: average(list),
        };
    });

    const best = [...played].filter((a) => a.rating !== null).sort((a, b) => b.rating! - a.rating!).slice(0, 3);
    const position = positionLabel(played[0]?.position ?? player.position);

    const resultOf = (a: (typeof appearances)[number]) => {
        const isHome = a.match.homeTeamId === a.teamId;
        const own = isHome ? a.match.homeScore : a.match.awayScore;
        const other = isHome ? a.match.awayScore : a.match.homeScore;
        const opponent = isHome ? a.match.awayTeam : a.match.homeTeam;
        const outcome = own > other ? 'V' : own < other ? 'D' : 'E';
        return { opponent, outcome, isHome, score: `${a.match.homeScore}-${a.match.awayScore}` };
    };

    const OUTCOME_STYLES: Record<string, string> = {
        V: 'bg-emerald-500 text-slate-950',
        E: 'bg-slate-500 text-white',
        D: 'bg-rose-500 text-white',
    };

    const tiles = [
        { icon: CalendarDays, label: 'Partidos', value: totals.matches, hint: `${totals.starts} de titular` },
        { icon: Clock, label: 'Minutos', value: totals.minutes.toLocaleString('es-MX'), hint: null },
        { icon: Goal, label: 'Goles', value: totals.goals, hint: null },
        { icon: Handshake, label: 'Asistencias', value: totals.assists, hint: null },
        { icon: Star, label: 'Nota media', value: totals.rating !== null ? totals.rating.toFixed(2) : '—', hint: 'según los datos' },
        { icon: Sparkles, label: 'Votos MVP', value: totalVotes, hint: communityMvpMatches.size ? `MVP en ${communityMvpMatches.size} partido(s)` : 'de la comunidad' },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28">
            {/* Cabecera */}
            <section className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-8 text-center sm:text-left">
                <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-500/40 bg-slate-800 shrink-0">
                    {player.photoUrl ? (
                        <Image src={player.photoUrl} alt={player.name} fill sizes="112px" className="object-cover" priority />
                    ) : (
                        <User className="w-12 h-12 text-slate-500 absolute inset-0 m-auto" />
                    )}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{player.name}</h1>
                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 text-xs">
                        {position && (
                            <span className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 font-semibold">{position}</span>
                        )}
                        {player.number !== null && (
                            <span className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300 font-mono font-bold">#{player.number}</span>
                        )}
                        {player.team && (
                            <TeamLink
                                slug={player.team.slug}
                                name={player.team.name}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 hover:border-emerald-500/40 text-slate-200 font-semibold transition-colors"
                            >
                                <TeamCrest name={player.team.name} crestUrl={player.team.crestUrl} size={16} />
                                {player.team.name}
                            </TeamLink>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">Estadísticas de los partidos de Champions League registrados en Matchbox.</p>
                </div>
            </section>

            {played.length === 0 ? (
                <p className="text-center text-slate-400 py-14 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl px-6">
                    Todavía no hay partidos con el detalle de este jugador. Se van completando cada día con el sync de datos.
                </p>
            ) : (
                <>
                    {/* Resumen */}
                    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {tiles.map(({ icon: Icon, label, value, hint }) => (
                            <div key={label} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-1">
                                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <Icon className="w-3.5 h-3.5 text-emerald-400" />
                                    {label}
                                </p>
                                <p className="text-2xl font-black text-white tabular-nums">{value}</p>
                                {hint && <p className="text-[11px] text-slate-500 truncate">{hint}</p>}
                            </div>
                        ))}
                    </section>

                    {/* Mejores actuaciones */}
                    {best.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-400" />
                                Mejores actuaciones
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {best.map((a) => {
                                    const { opponent, isHome } = resultOf(a);
                                    const s = statsOf(a);
                                    return (
                                        <Link
                                            key={a.id}
                                            href={`/matches/${a.match.id}`}
                                            className="block bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 space-y-2 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-2 min-w-0 text-sm font-bold text-white">
                                                    <TeamCrest name={opponent.name} crestUrl={opponent.crestUrl} size={20} />
                                                    <span className="truncate">{isHome ? 'vs' : 'en'} {opponent.shortName || opponent.name}</span>
                                                </span>
                                                <RatingBadge rating={a.rating} />
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {a.match.homeTeam.shortName || a.match.homeTeam.name} {a.match.homeScore}-{a.match.awayScore} {a.match.awayTeam.shortName || a.match.awayTeam.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                {[a.match.stage, a.match.season].filter(Boolean).join(' · ')}
                                                {(s.goals ?? 0) > 0 && ` · ${s.goals} gol${s.goals === 1 ? '' : 'es'}`}
                                                {(s.assists ?? 0) > 0 && ` · ${s.assists} asist.`}
                                            </p>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Por temporada */}
                    <section className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                            <ListOrdered className="w-5 h-5 text-emerald-400" />
                            Por temporada
                        </h2>
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-x-auto">
                            <table className="w-full min-w-[480px] text-xs sm:text-sm">
                                <thead>
                                    <tr className="text-[11px] text-slate-500 border-b border-slate-800">
                                        <th className="py-2.5 px-4 text-left font-bold">Temporada</th>
                                        <th className="py-2.5 px-2 font-bold" title="Partidos jugados">PJ</th>
                                        <th className="py-2.5 px-2 font-bold" title="Minutos">Min</th>
                                        <th className="py-2.5 px-2 font-bold" title="Goles">G</th>
                                        <th className="py-2.5 px-2 font-bold" title="Asistencias">A</th>
                                        <th className="py-2.5 px-2 font-bold" title="Tarjetas amarillas">TA</th>
                                        <th className="py-2.5 px-2 font-bold" title="Tarjetas rojas">TR</th>
                                        <th className="py-2.5 px-4 font-bold" title="Nota media">Nota</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seasons.map((s) => (
                                        <tr key={s.season} className="border-b border-slate-800/60 last:border-0">
                                            <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">{s.season}</td>
                                            <td className="py-2.5 px-2 text-center tabular-nums text-slate-300">{s.matches}</td>
                                            <td className="py-2.5 px-2 text-center tabular-nums text-slate-300">{s.minutes}</td>
                                            <td className="py-2.5 px-2 text-center tabular-nums font-bold text-white">{s.goals}</td>
                                            <td className="py-2.5 px-2 text-center tabular-nums font-bold text-white">{s.assists}</td>
                                            <td className="py-2.5 px-2 text-center tabular-nums text-slate-300">{s.yellow}</td>
                                            <td className="py-2.5 px-2 text-center tabular-nums text-slate-300">{s.red}</td>
                                            <td className="py-2.5 px-4 text-center"><RatingBadge rating={s.rating !== null ? Math.round(s.rating * 10) / 10 : null} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Historial */}
                    <section className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-black text-white">Partidos</h2>
                        <ol className="divide-y divide-slate-800/80 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                            {played.map((a) => {
                                const { opponent, outcome, isHome, score } = resultOf(a);
                                const s = statsOf(a);
                                const wasMvp = communityMvpMatches.has(a.match.id);
                                return (
                                    <li key={a.id}>
                                        <Link href={`/matches/${a.match.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors">
                                            <span className={`w-6 h-6 shrink-0 rounded text-[11px] font-black flex items-center justify-center ${OUTCOME_STYLES[outcome]}`} title={{ V: 'Victoria', E: 'Empate', D: 'Derrota' }[outcome]}>
                                                {outcome}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                                                    <TeamCrest name={opponent.name} crestUrl={opponent.crestUrl} size={18} />
                                                    <span className="truncate">{isHome ? 'vs' : 'en'} {opponent.shortName || opponent.name}</span>
                                                    <span className="font-mono text-xs text-slate-400 shrink-0">{score}</span>
                                                </span>
                                                <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                                                    <span>{a.match.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    <span className="hidden sm:inline">· {a.match.stage}</span>
                                                    <span>· {a.minutes ?? 0}&apos;</span>
                                                    {(s.goals ?? 0) > 0 && <span className="text-emerald-400 font-bold">· {s.goals} G</span>}
                                                    {(s.assists ?? 0) > 0 && <span className="text-sky-400 font-bold">· {s.assists} A</span>}
                                                    {wasMvp && (
                                                        <span className="inline-flex items-center gap-0.5 text-amber-300 font-bold">
                                                            · <Sparkles className="w-3 h-3" /> MVP
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                            <RatingBadge rating={a.rating} />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                </>
            )}
        </div>
    );
}
