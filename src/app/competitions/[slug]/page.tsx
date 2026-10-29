import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Goal, Handshake, ListOrdered, Square } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSeasonLeaders, type LeaderCategory } from '@/lib/season-leaders';
import { playerHref } from '@/lib/players';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';

export const revalidate = 0;

interface CompetitionPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ season?: string }>;
}

export async function generateMetadata({ params, searchParams }: CompetitionPageProps): Promise<Metadata> {
    const [{ slug }, { season }] = await Promise.all([params, searchParams]);
    const competition = await prisma.competition.findUnique({ where: { slug }, select: { name: true } });
    if (!competition) return { title: 'Competición no encontrada | Matchbox' };
    return {
        title: `${competition.name}${season ? ` ${season}` : ''}: tabla y goleadores | Matchbox`,
        description: `Tabla de posiciones, goleadores, asistencias y tarjetas de la ${competition.name}.`,
    };
}

// Qué significa cada puesto según el texto de la API -> color de la posición. Ejemplos reales:
//   "Promotion - Champions League (Play Offs: 1/8-finals)"  -> directo a octavos
//   "Promotion - Champions League (Play Offs: 1/16-finals)" -> playoff de eliminatoria
//   "Promotion - Europa League (Play Offs: 1/16-finals)"    -> pasa a la Europa League
type Zone = 'direct' | 'playoff' | 'europa' | 'none';
function zoneOf(description: string | null): Zone {
    const text = (description ?? '').toLowerCase();
    if (/europa|conference/.test(text)) return 'europa';
    if (/1\/16/.test(text)) return 'playoff';
    if (/1\/8|round of 16|next round|champions league/.test(text)) return 'direct';
    return 'none';
}

const ZONE_STYLES: Record<Zone, string> = {
    direct: 'bg-sky-500 text-white',
    playoff: 'bg-amber-400 text-slate-950',
    europa: 'bg-orange-500/80 text-white',
    none: 'bg-slate-800 text-slate-300',
};

const ZONE_LABELS: Record<Exclude<Zone, 'none'>, string> = {
    direct: 'Clasificación a octavos (o siguiente ronda)',
    playoff: 'Playoff de eliminatoria',
    europa: 'Pasa a la Europa League',
};

const FORM_STYLES: Record<string, { label: string; className: string }> = {
    W: { label: 'V', className: 'bg-emerald-500 text-slate-950' },
    D: { label: 'E', className: 'bg-slate-500 text-white' },
    L: { label: 'D', className: 'bg-rose-500 text-white' },
};

const LEADER_SECTIONS: { category: LeaderCategory; title: string; icon: typeof Goal }[] = [
    { category: 'goals', title: 'Goles', icon: Goal },
    { category: 'assists', title: 'Asistencias', icon: Handshake },
    { category: 'yellowCards', title: 'Tarjetas amarillas', icon: Square },
    { category: 'redCards', title: 'Tarjetas rojas', icon: Square },
];

const VISIBLE_LEADERS = 6;

export default async function CompetitionPage({ params, searchParams }: CompetitionPageProps) {
    const [{ slug }, { season: requestedSeason }] = await Promise.all([params, searchParams]);

    const competition = await prisma.competition.findUnique({
        where: { slug },
        select: { id: true, name: true, logoUrl: true, seasons: { where: { standingsSyncedAt: { not: null } }, select: { season: true }, orderBy: { season: 'desc' } } },
    });
    if (!competition) notFound();

    const seasons = competition.seasons.map((s) => s.season);
    const season = requestedSeason && seasons.includes(requestedSeason) ? requestedSeason : seasons[0];

    const [standings, leaderData] = season
        ? await Promise.all([
            prisma.standing.findMany({
                where: { competitionId: competition.id, season },
                include: { team: { select: { name: true, shortName: true, slug: true, crestUrl: true } } },
                orderBy: [{ groupName: 'asc' }, { rank: 'asc' }],
            }),
            getSeasonLeaders(competition.id, season),
        ])
        : [[], null];

    const groups = new Map<string, typeof standings>();
    for (const row of standings) groups.set(row.groupName, [...(groups.get(row.groupName) ?? []), row]);
    const usedZones = new Set(standings.map((row) => zoneOf(row.description)).filter((z) => z !== 'none'));

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28">
            {/* Cabecera */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-4 min-w-0">
                    {competition.logoUrl && (
                        <div className="w-14 h-14 rounded-2xl bg-white p-2 shrink-0 relative">
                            <Image src={competition.logoUrl} alt="" fill sizes="56px" className="object-contain p-2" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{competition.name}</h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Tabla, goleadores y tarjetas{season ? ` · ${season}` : ''}</p>
                    </div>
                </div>

                {seasons.length > 0 && (
                    <div role="group" aria-label="Temporada" className="flex flex-wrap gap-2">
                        {seasons.map((s) => (
                            <Link
                                key={s}
                                href={`/competitions/${slug}?season=${s}`}
                                scroll={false}
                                aria-current={s === season ? 'page' : undefined}
                                className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors ${s === season ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                {s}
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {!season ? (
                <p className="text-center text-slate-400 py-16 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
                    Todavía no hay tablas descargadas. Se llenan con el sync diario (npm run sync:daily).
                </p>
            ) : (
                <>
                    {/* Tablas de posiciones */}
                    <section className="space-y-4">
                        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                            <ListOrdered className="w-5 h-5 text-emerald-400" />
                            {groups.size > 1 ? 'Fase de grupos' : 'Tabla'}
                        </h2>

                        <div className={groups.size > 1 ? 'grid gap-4 lg:grid-cols-2' : ''}>
                            {[...groups.entries()].map(([groupName, rows]) => (
                                <div key={groupName || 'tabla'} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                                    {groupName && (
                                        <h3 className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 bg-slate-950/40">
                                            {groupName.replace('Group', 'Grupo')}
                                        </h3>
                                    )}
                                    <table className="w-full text-xs sm:text-sm">
                                        <thead>
                                            <tr className="text-[11px] text-slate-500 border-b border-slate-800">
                                                <th className="py-2 pl-3 w-8 text-left font-bold">#</th>
                                                <th className="py-2 px-2 text-left font-bold">Equipo</th>
                                                <th className="py-2 px-1.5 font-bold" title="Puntos">Pts</th>
                                                <th className="py-2 px-1.5 font-bold" title="Partidos jugados">PJ</th>
                                                <th className="py-2 px-1.5 font-bold hidden sm:table-cell" title="Ganados">G</th>
                                                <th className="py-2 px-1.5 font-bold hidden sm:table-cell" title="Empatados">E</th>
                                                <th className="py-2 px-1.5 font-bold hidden sm:table-cell" title="Perdidos">P</th>
                                                <th className="py-2 px-1.5 font-bold hidden md:table-cell" title="Goles a favor : en contra">Goles</th>
                                                <th className="py-2 px-1.5 font-bold" title="Diferencia de goles">Dif</th>
                                                <th className={`py-2 px-2 font-bold hidden ${groups.size > 1 ? 'xl:table-cell' : 'md:table-cell'}`}>Últimos</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr key={row.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30">
                                                    <td className="py-2 pl-3">
                                                        <span
                                                            title={row.description ?? undefined}
                                                            className={`inline-flex w-6 h-6 items-center justify-center rounded-md text-[11px] font-black ${ZONE_STYLES[zoneOf(row.description)]}`}
                                                        >
                                                            {row.rank}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2 max-w-0 w-full">
                                                        <TeamLink slug={row.team.slug} name={row.team.name} className="flex items-center gap-2 min-w-0 font-semibold text-slate-100 hover:text-emerald-400 transition-colors">
                                                            <TeamCrest name={row.team.name} crestUrl={row.team.crestUrl} size={22} />
                                                            <span className="truncate">{row.team.shortName || row.team.name}</span>
                                                        </TeamLink>
                                                    </td>
                                                    <td className="py-2 px-1.5 text-center font-black text-white tabular-nums">{row.points}</td>
                                                    <td className="py-2 px-1.5 text-center text-slate-400 tabular-nums">{row.played}</td>
                                                    <td className="py-2 px-1.5 text-center text-slate-400 tabular-nums hidden sm:table-cell">{row.win}</td>
                                                    <td className="py-2 px-1.5 text-center text-slate-400 tabular-nums hidden sm:table-cell">{row.draw}</td>
                                                    <td className="py-2 px-1.5 text-center text-slate-400 tabular-nums hidden sm:table-cell">{row.lose}</td>
                                                    <td className="py-2 px-1.5 text-center text-slate-400 tabular-nums hidden md:table-cell">{row.goalsFor}:{row.goalsAgainst}</td>
                                                    <td className={`py-2 px-1.5 text-center font-bold tabular-nums ${row.goalsDiff > 0 ? 'text-emerald-400' : row.goalsDiff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                        {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                                                    </td>
                                                    <td className={`py-2 px-2 hidden ${groups.size > 1 ? 'xl:table-cell' : 'md:table-cell'}`}>
                                                        <span className="flex justify-center gap-0.5" title="Últimos partidos, el más reciente a la izquierda">
                                                            {/* La API manda la forma con el resultado más reciente primero */}
                                                            {(row.form ?? '').slice(0, 5).split('').map((result, i) => {
                                                                const style = FORM_STYLES[result];
                                                                return style ? (
                                                                    <span key={i} className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${style.className}`}>{style.label}</span>
                                                                ) : null;
                                                            })}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>

                        {usedZones.size > 0 && (
                            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                                {[...usedZones].map((zone) => (
                                    <li key={zone} className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-sm ${ZONE_STYLES[zone]}`} />
                                        {ZONE_LABELS[zone as Exclude<Zone, 'none'>]}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Goleadores y tarjetas */}
                    <section className="space-y-4">
                        <h2 className="text-lg sm:text-xl font-black text-white">Goleadores y tarjetas</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {LEADER_SECTIONS.map(({ category, title, icon: Icon }) => {
                                const list = leaderData?.leaders[category] ?? [];
                                if (list.length === 0) return null;
                                const iconColor = category === 'redCards' ? 'text-rose-500 fill-rose-500' : category === 'yellowCards' ? 'text-amber-400 fill-amber-400' : 'text-emerald-400';

                                const renderRow = (leader: (typeof list)[number]) => (
                                    <li key={leader.player.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/60 last:border-0">
                                        <span className="w-4 text-[11px] font-bold text-slate-500 tabular-nums">{leader.rank}</span>
                                        <TeamCrest name={leader.team?.name ?? leader.player.name} crestUrl={leader.team?.crestUrl ?? null} size={20} />
                                        <Link href={playerHref(leader.player.id)} className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-100 hover:text-emerald-400 transition-colors">{leader.player.name}</Link>
                                        <span className="text-[10px] text-slate-500 hidden sm:inline">{leader.played} PJ</span>
                                        <span className="text-sm font-black text-white tabular-nums">{leader.value}</span>
                                    </li>
                                );

                                return (
                                    <div key={category} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                                        <h3 className="flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 bg-slate-950/40">
                                            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                                            {title}
                                        </h3>
                                        <ul>{list.slice(0, VISIBLE_LEADERS).map(renderRow)}</ul>
                                        {list.length > VISIBLE_LEADERS && (
                                            // <details> despliega el resto sin JavaScript
                                            <details className="group">
                                                <summary className="list-none cursor-pointer select-none text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 py-2.5 border-t border-slate-800 [&::-webkit-details-marker]:hidden">
                                                    <span className="group-open:hidden">Ver más ({list.length - VISIBLE_LEADERS})</span>
                                                    <span className="hidden group-open:inline">Ver menos</span>
                                                </summary>
                                                <ul className="border-t border-slate-800">{list.slice(VISIBLE_LEADERS).map(renderRow)}</ul>
                                            </details>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Calculado con las estadísticas de cada partido (fase de grupos/liga y eliminatorias).
                            {leaderData && leaderData.matchesWithDetails < leaderData.totalMatches && (
                                <> Por ahora incluye {leaderData.matchesWithDetails} de {leaderData.totalMatches} partidos: el resto se completa con el sync diario.</>
                            )}
                        </p>
                    </section>
                </>
            )}
        </div>
    );
}
