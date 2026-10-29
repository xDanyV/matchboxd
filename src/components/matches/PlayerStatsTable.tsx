'use client';

import { useState } from 'react';
import Link from 'next/link';
import { playerHref } from '@/lib/players';
import { Users } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import RatingBadge from '@/components/matches/RatingBadge';
import type { PlayerMatchStats } from '@/lib/match-stats';

export interface PlayerRow {
    id: string;
    name: string;
    position: string | null;
    isStarter: boolean;
    minutes: number | null;
    rating: number | null;
    stats: PlayerMatchStats;
}

interface TeamRows {
    name: string;
    shortName?: string | null;
    crestUrl: string | null;
    players: PlayerRow[];
}

const POSITION_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

const dash = (value: number | undefined) => (value === undefined ? '—' : value);
// La API manda null en goles y asistencias cuando son 0: si jugó, se muestra 0
const countOf = (p: PlayerRow, value: number | undefined) => value ?? ((p.minutes ?? 0) > 0 ? 0 : '—');

const COLUMNS: { key: string; label: string; title: string; value: (p: PlayerRow) => string | number }[] = [
    { key: 'min', label: 'Min', title: 'Minutos jugados', value: (p) => dash(p.minutes ?? undefined) },
    { key: 'g', label: 'G', title: 'Goles', value: (p) => countOf(p, p.stats.goals) },
    { key: 'a', label: 'A', title: 'Asistencias', value: (p) => countOf(p, p.stats.assists) },
    { key: 'sh', label: 'Rem.', title: 'Remates (al arco)', value: (p) => (p.stats.shotsTotal === undefined ? '—' : `${p.stats.shotsTotal} (${p.stats.shotsOn ?? 0})`) },
    { key: 'pa', label: 'Pases', title: 'Pases (acertados)', value: (p) => (p.stats.passesTotal === undefined ? '—' : `${p.stats.passesTotal} (${p.stats.passesAccurate ?? 0})`) },
    { key: 'kp', label: 'P. clave', title: 'Pases clave', value: (p) => dash(p.stats.passesKey) },
    { key: 'ta', label: 'Entr.', title: 'Entradas', value: (p) => dash(p.stats.tackles) },
    { key: 'du', label: 'Duelos', title: 'Duelos ganados / disputados', value: (p) => (p.stats.duelsTotal === undefined ? '—' : `${p.stats.duelsWon ?? 0}/${p.stats.duelsTotal}`) },
    { key: 'sv', label: 'Atajadas', title: 'Atajadas', value: (p) => dash(p.stats.saves) },
];

export default function PlayerStatsTable({ home, away }: { home: TeamRows; away: TeamRows }) {
    const [side, setSide] = useState<'home' | 'away'>('home');
    const team = side === 'home' ? home : away;

    // Titulares por posición, luego los suplentes que jugaron
    const rows = team.players
        .filter((p) => (p.minutes ?? 0) > 0 || p.isStarter)
        .sort(
            (a, b) =>
                Number(b.isStarter) - Number(a.isStarter) ||
                (POSITION_ORDER[a.position ?? ''] ?? 9) - (POSITION_ORDER[b.position ?? ''] ?? 9) ||
                (b.rating ?? 0) - (a.rating ?? 0)
        );

    return (
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Jugadores
                </h3>
                <div role="tablist" aria-label="Equipo" className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {(['home', 'away'] as const).map((key) => {
                        const t = key === 'home' ? home : away;
                        const active = side === key;
                        return (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={active}
                                onClick={() => setSide(key)}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <TeamCrest name={t.name} crestUrl={t.crestUrl} size={16} />
                                <span className="truncate max-w-[8rem]">{t.shortName || t.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* La tabla se desplaza dentro de su tarjeta en pantallas chicas, no la página */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs">
                    <thead>
                        <tr className="text-slate-500 border-b border-slate-800">
                            <th className="sticky left-0 z-10 bg-slate-900 text-left font-bold py-2 pr-3">Jugador</th>
                            <th className="font-bold py-2 px-2" title="Nota del partido">Nota</th>
                            {COLUMNS.map((c) => (
                                <th key={c.key} title={c.title} className="font-bold py-2 px-2 whitespace-nowrap">{c.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((p) => (
                            <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                                <td className="sticky left-0 z-10 bg-slate-900 py-2 pr-3">
                                    <span className="flex items-center gap-2 max-w-[11rem]">
                                        <span className="w-4 shrink-0 text-[10px] font-bold text-slate-500">{p.position ?? ''}</span>
                                        <Link href={playerHref(p.id)} className={`truncate font-semibold hover:text-emerald-400 transition-colors ${p.isStarter ? 'text-white' : 'text-slate-300'}`}>{p.name}</Link>
                                    </span>
                                </td>
                                <td className="py-2 px-2 text-center"><RatingBadge rating={p.rating} /></td>
                                {COLUMNS.map((c) => (
                                    <td key={c.key} className="py-2 px-2 text-center font-mono tabular-nums text-slate-300 whitespace-nowrap">{c.value(p)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[11px] text-slate-500">Datos y notas de API-Football. &quot;—&quot;: la fuente no registró ese dato.</p>
        </section>
    );
}
