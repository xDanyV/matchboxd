import { BarChart3 } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import { TEAM_STAT_ROWS, type TeamStats } from '@/lib/match-stats';

interface SideTeam {
    name: string;
    shortName?: string | null;
    crestUrl: string | null;
}

interface MatchStatsSectionProps {
    homeTeam: SideTeam;
    awayTeam: SideTeam;
    home: TeamStats;
    away: TeamStats;
}

function formatValue(value: number | undefined, percent?: boolean, decimals?: number) {
    if (value === undefined) return '—';
    const text = decimals ? value.toFixed(decimals) : String(Math.round(value));
    return percent ? `${text}%` : text;
}

/** Comparativa de estadísticas: cada fila reparte una barra según el peso de cada equipo. */
export default function MatchStatsSection({ homeTeam, awayTeam, home, away }: MatchStatsSectionProps) {
    const rows = TEAM_STAT_ROWS.filter(({ key }) => home[key] !== undefined || away[key] !== undefined);
    if (rows.length === 0) return null;

    return (
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Estadísticas
                </h3>
                <div className="flex items-center gap-3">
                    <TeamCrest name={homeTeam.name} crestUrl={homeTeam.crestUrl} size={24} />
                    <span className="text-[11px] text-slate-600 font-bold">VS</span>
                    <TeamCrest name={awayTeam.name} crestUrl={awayTeam.crestUrl} size={24} />
                </div>
            </div>

            <ul className="space-y-4">
                {rows.map(({ key, label, percent, decimals }) => {
                    const h = home[key];
                    const a = away[key];
                    const total = (h ?? 0) + (a ?? 0);
                    const homeShare = total > 0 ? ((h ?? 0) / total) * 100 : 50;
                    const homeLeads = (h ?? 0) > (a ?? 0);
                    const awayLeads = (a ?? 0) > (h ?? 0);

                    return (
                        <li key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                                <span className={`font-mono font-bold tabular-nums w-14 ${homeLeads ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    {formatValue(h, percent, decimals)}
                                </span>
                                <span className="text-slate-400 font-medium text-center">{label}</span>
                                <span className={`font-mono font-bold tabular-nums w-14 text-right ${awayLeads ? 'text-sky-400' : 'text-slate-300'}`}>
                                    {formatValue(a, percent, decimals)}
                                </span>
                            </div>
                            <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800 gap-0.5" aria-hidden="true">
                                <div className={`h-full rounded-l-full ${homeLeads ? 'bg-emerald-500' : 'bg-emerald-500/40'}`} style={{ width: `${homeShare}%` }} />
                                <div className={`h-full flex-1 rounded-r-full ${awayLeads ? 'bg-sky-500' : 'bg-sky-500/40'}`} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
