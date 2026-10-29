import Link from 'next/link';
import { Shirt } from 'lucide-react';
import { playerHref } from '@/lib/players';
import TeamCrest from '@/components/teams/TeamCrest';
import RatingBadge from '@/components/matches/RatingBadge';

export interface PitchPlayer {
    id: string;
    name: string;
    number: number | null;
    position: string | null;
    grid: string | null;
    isStarter: boolean;
    isCaptain: boolean;
    minutes: number | null;
    rating: number | null;
}

export interface TeamLineupData {
    team: { name: string; shortName?: string | null; crestUrl: string | null };
    formation: string | null;
    coachName: string | null;
    shirtColor: string | null;
    numberColor: string | null;
    keeperColor: string | null;
    players: PitchPlayer[];
}

const HEX = /^[0-9a-f]{6}$/i;
const color = (hex: string | null, fallback: string) => (hex && HEX.test(hex) ? `#${hex}` : fallback);

/** Luminancia relativa (WCAG) de un color #rrggbb */
function luminance(hex: string) {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * La API solo trae el color del número de los jugadores de campo; con la camiseta del portero
 * puede no leerse. Si el contraste es bajo se usa blanco o negro, lo que se lea mejor.
 */
function readableNumber(shirt: string, number: string) {
    const [light, dark] = [luminance(shirt), luminance(number)].sort((a, b) => b - a);
    if ((light + 0.05) / (dark + 0.05) >= 3) return number;
    return luminance(shirt) > 0.4 ? '#0f172a' : '#ffffff';
}

/** "Gianluigi Donnarumma" / "G. Donnarumma" -> "Donnarumma" */
const shortName = (name: string) => name.trim().split(/\s+/).pop() ?? name;

function parseGrid(grid: string | null) {
    const [row, col] = (grid ?? '').split(':').map(Number);
    return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null;
}

/**
 * Posición en la cancha (en %): el local ocupa la mitad de arriba y el visitante la de abajo,
 * cada uno con su portero junto a su arco. La API numera las filas desde el portero.
 */
function placePlayers(players: PitchPlayer[], side: 'home' | 'away') {
    const starters = players
        .map((p) => ({ player: p, grid: parseGrid(p.grid) }))
        .filter((p): p is { player: PitchPlayer; grid: { row: number; col: number } } => p.player.isStarter && p.grid !== null);

    const rows = Math.max(...starters.map((s) => s.grid.row), 1);
    const byRow = new Map<number, typeof starters>();
    for (const s of starters) byRow.set(s.grid.row, [...(byRow.get(s.grid.row) ?? []), s]);

    return starters.map(({ player, grid }) => {
        const line = (byRow.get(grid.row) ?? []).sort((a, b) => a.grid.col - b.grid.col);
        const index = line.findIndex((s) => s.player.id === player.id);
        const depth = rows > 1 ? ((grid.row - 1) / (rows - 1)) * 40 : 0;
        const across = ((index + 1) / (line.length + 1)) * 100;
        return {
            player,
            top: side === 'home' ? 5 + depth : 95 - depth,
            // La API numera las columnas desde la izquierda del propio equipo. El local ataca hacia
            // abajo, así que su izquierda queda a la derecha de la pantalla; el visitante, al revés.
            left: side === 'home' ? 100 - across : across,
        };
    });
}

function PlayerMarker({ player, shirt, number }: { player: PitchPlayer; shirt: string; number: string }) {
    return (
        <Link href={playerHref(player.id)} title={player.name} className="group flex flex-col items-center gap-0.5 w-16 sm:w-20">
            <div className="relative">
                <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white/80 shadow-md flex items-center justify-center text-[11px] sm:text-xs font-black"
                    style={{ backgroundColor: shirt, color: number }}
                >
                    {player.number ?? ''}
                </div>
                {player.isCaptain && (
                    <span className="absolute -top-1 -left-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center" title="Capitán">
                        C
                    </span>
                )}
                <RatingBadge rating={player.rating} className="absolute -top-1.5 -right-4" />
            </div>
            <span className="max-w-full truncate rounded px-1 bg-slate-950/70 text-[10px] sm:text-[11px] font-semibold text-white leading-tight group-hover:text-emerald-300">
                {shortName(player.name)}
            </span>
        </Link>
    );
}

function TeamHeader({ lineup, accent }: { lineup: TeamLineupData; accent: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
                <TeamCrest name={lineup.team.name} crestUrl={lineup.team.crestUrl} size={24} />
                <span className="text-sm font-bold text-white truncate">{lineup.team.shortName || lineup.team.name}</span>
                {lineup.formation && <span className={`text-xs font-mono font-bold ${accent}`}>{lineup.formation}</span>}
            </div>
            {lineup.coachName && <span className="text-[11px] text-slate-400 truncate">DT: {lineup.coachName}</span>}
        </div>
    );
}

function Bench({ lineup, title }: { lineup: TeamLineupData; title: string }) {
    // Primero los que entraron, luego los que no jugaron
    const subs = lineup.players
        .filter((p) => !p.isStarter)
        .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0));

    if (subs.length === 0) return null;

    return (
        <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
            <ul className="space-y-1">
                {subs.map((p) => {
                    const played = (p.minutes ?? 0) > 0;
                    return (
                        <li key={p.id} className={`flex items-center gap-2 text-xs ${played ? 'text-slate-200' : 'text-slate-500'}`}>
                            <span className="w-5 text-right font-mono text-slate-500">{p.number ?? ''}</span>
                            <Link href={playerHref(p.id)} className="flex-1 truncate hover:text-emerald-400 transition-colors">{p.name}</Link>
                            {played && <span className="text-[10px] text-slate-500 font-mono">{p.minutes}&apos;</span>}
                            <RatingBadge rating={p.rating} />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default function LineupPitch({ home, away }: { home: TeamLineupData; away: TeamLineupData }) {
    const homePlaced = placePlayers(home.players, 'home');
    const awayPlaced = placePlayers(away.players, 'away');

    // Sin posiciones en la cancha (algunos partidos antiguos) no se dibuja: solo quedan las listas
    const canDraw = homePlaced.length >= 7 && awayPlaced.length >= 7;

    const homeShirt = color(home.shirtColor, '#10b981');
    const awayShirt = color(away.shirtColor, '#0ea5e9');

    const kit = (lineup: TeamLineupData, outfieldShirt: string, isKeeper: boolean) => {
        const shirt = isKeeper ? color(lineup.keeperColor, '#f59e0b') : outfieldShirt;
        return { shirt, number: readableNumber(shirt, color(lineup.numberColor, '#ffffff')) };
    };

    return (
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-emerald-400" />
                Alineaciones
            </h3>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
                <div className="order-2 lg:order-1">
                    <Bench lineup={home} title={`Suplentes · ${home.team.shortName || home.team.name}`} />
                </div>

                <div className="order-1 lg:order-2 space-y-3">
                    <TeamHeader lineup={home} accent="text-emerald-400" />

                    {canDraw && (
                        <div
                            className="relative w-full aspect-[9/16] sm:aspect-[2/3] max-w-md mx-auto rounded-2xl overflow-hidden border border-emerald-900/60 bg-[repeating-linear-gradient(0deg,#14532d_0,#14532d_8%,#166534_8%,#166534_16%)]"
                            role="img"
                            aria-label={`Alineaciones: ${home.team.name} ${home.formation ?? ''} contra ${away.team.name} ${away.formation ?? ''}`}
                        >
                            {/* Líneas de la cancha */}
                            <div className="absolute inset-3 border-2 border-white/25 rounded-sm" />
                            <div className="absolute left-3 right-3 top-1/2 border-t-2 border-white/25" />
                            <div className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
                            <div className="absolute left-1/2 top-3 w-2/5 h-[13%] -translate-x-1/2 border-2 border-t-0 border-white/25" />
                            <div className="absolute left-1/2 bottom-3 w-2/5 h-[13%] -translate-x-1/2 border-2 border-b-0 border-white/25" />

                            {homePlaced.map(({ player, top, left }) => (
                                <div key={player.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: `${top}%`, left: `${left}%` }}>
                                    <PlayerMarker player={player} {...kit(home, homeShirt, player.position === 'G')} />
                                </div>
                            ))}
                            {awayPlaced.map(({ player, top, left }) => (
                                <div key={player.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: `${top}%`, left: `${left}%` }}>
                                    <PlayerMarker player={player} {...kit(away, awayShirt, player.position === 'G')} />
                                </div>
                            ))}
                        </div>
                    )}

                    <TeamHeader lineup={away} accent="text-sky-400" />
                </div>

                <div className="order-3">
                    <Bench lineup={away} title={`Suplentes · ${away.team.shortName || away.team.name}`} />
                </div>
            </div>
        </section>
    );
}
