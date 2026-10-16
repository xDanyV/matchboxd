'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRightLeft, Ban, Clock, Goal, Tv, ChevronDown } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import {
    analyzeScores,
    buildRows,
    eventLabel,
    formatMinute,
    isKeyMoment,
    isScoringGoal,
    matchesFilter,
    type EventFilter,
    type MatchEventKind,
    type Score,
    type TeamSide,
    type TimelineEvent,
} from '@/lib/match-events';

interface TimelineTeam {
    name: string;
    crestUrl: string | null;
}

interface MatchTimelineProps {
    events: TimelineEvent[];
    homeTeam: TimelineTeam;
    awayTeam: TimelineTeam;
    homeScore: number;
    awayScore: number;
}

const FILTERS: { key: EventFilter; label: string }[] = [
    { key: 'all', label: 'Todo' },
    { key: 'goals', label: 'Goles' },
    { key: 'cards', label: 'Tarjetas' },
    { key: 'subs', label: 'Cambios' },
];

const GRID_MOBILE = 'grid-cols-[3.5rem_minmax(0,1fr)]';
const GRID_DESKTOP = 'md:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)]';

function EventIcon({ kind }: { kind: MatchEventKind }) {
    let icon: ReactNode;

    switch (kind) {
        case 'GOAL':
        case 'PENALTY_GOAL':
            icon = <Goal className="w-4 h-4 text-emerald-400" />;
            break;
        case 'OWN_GOAL':
            icon = <Goal className="w-4 h-4 text-rose-400" />;
            break;
        case 'MISSED_PENALTY':
            icon = <Ban className="w-4 h-4 text-slate-400" />;
            break;
        case 'YELLOW_CARD':
            icon = <span className="h-4 w-3 rounded-[3px] bg-yellow-400" />;
            break;
        case 'RED_CARD':
            icon = <span className="h-4 w-3 rounded-[3px] bg-red-500" />;
            break;
        case 'SECOND_YELLOW':
            icon = (
                <span className="relative block h-4 w-4">
                    <span className="absolute left-0 top-0 h-3.5 w-2.5 rounded-[2px] bg-yellow-400" />
                    <span className="absolute bottom-0 right-0 h-3.5 w-2.5 rounded-[2px] bg-red-500" />
                </span>
            );
            break;
        case 'SUBSTITUTION':
            icon = <ArrowRightLeft className="w-4 h-4 text-sky-400" />;
            break;
        default:
            icon = <Tv className="w-4 h-4 text-violet-400" />;
    }

    return (
        <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-950"
        >
            {icon}
        </span>
    );
}

function subtitleFor(event: TimelineEvent, label: string) {
    if (event.kind === 'VAR') return event.playerName;
    if (isScoringGoal(event.kind) && event.relatedPlayerName) {
        return `${label} · Asistencia: ${event.relatedPlayerName}`;
    }
    return label;
}

function EventBody({
    event,
    score,
    align,
    teamName,
}: {
    event: TimelineEvent;
    score: Score | null;
    align: 'left' | 'right';
    teamName: string;
}) {
    const label = eventLabel(event.kind, event.detail);
    const isSubstitution = event.kind === 'SUBSTITUTION';
    const subtitle = subtitleFor(event, label);

    return (
        <div
            className={`flex min-w-0 items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : 'text-left'
                }`}
        >
            <EventIcon kind={event.kind} />

            <div className="min-w-0 space-y-0.5">
                {isSubstitution ? (
                    <>
                        <p className="truncate text-sm font-bold text-white">
                            <span className="sr-only">Entra: </span>
                            <span aria-hidden="true" className="mr-1 text-emerald-400">
                                ↑
                            </span>
                            {event.playerName ?? 'Jugador no disponible'}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                            <span className="sr-only">Sale: </span>
                            <span aria-hidden="true" className="mr-1 text-rose-400">
                                ↓
                            </span>
                            {event.relatedPlayerName ?? 'Jugador no disponible'}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="truncate text-sm font-bold text-white">
                            {event.kind === 'VAR' ? label : (event.playerName ?? label)}
                        </p>
                        {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
                    </>
                )}
                <p className="truncate text-[11px] text-slate-500 md:hidden">{teamName}</p>
            </div>

            {score && isScoringGoal(event.kind) && (
                <span className="shrink-0 rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                    {score.home} - {score.away}
                </span>
            )}
        </div>
    );
}

function MomentDot({ kind }: { kind: MatchEventKind }) {
    if (kind === 'OWN_GOAL') {
        return <span className="block h-4 w-4 rounded-full bg-rose-400 ring-2 ring-slate-900" />;
    }
    if (kind === 'RED_CARD' || kind === 'SECOND_YELLOW') {
        return <span className="block h-4 w-3 rounded-[3px] bg-red-500 ring-2 ring-slate-900" />;
    }
    if (kind === 'MISSED_PENALTY') {
        return <span className="block h-4 w-4 rounded-full border-2 border-slate-400 bg-slate-900" />;
    }
    return <span className="block h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-slate-900" />;
}

function KeyMoments({
    events,
    homeTeam,
    awayTeam,
}: {
    events: TimelineEvent[];
    homeTeam: TimelineTeam;
    awayTeam: TimelineTeam;
}) {
    const moments = events.filter((event) => isKeyMoment(event.kind));
    if (moments.length === 0) return null;

    const lastMinute = Math.max(90, ...events.map((event) => event.minute));
    const total = lastMinute > 90 ? Math.max(120, lastMinute) : 90;
    const ticks = total > 90 ? [0, 45, 90, total] : [0, 45, 90];

    const markerPosition = (minute: number) =>
        `${Math.min(97, Math.max(3, (minute / total) * 100))}%`;
    const tickPosition = (minute: number) => `${(minute / total) * 100}%`;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Minutos clave
                </h4>
                <p className="truncate text-[11px] text-slate-500">
                    Arriba: {homeTeam.name} · Abajo: {awayTeam.name}
                </p>
            </div>

            <div className="px-4">
                <div
                    role="img"
                    aria-label={`${moments.length} momentos clave del partido`}
                    className="relative h-16"
                >
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700" />

                    {moments.map((event) => (
                        <span
                            key={event.id}
                            title={`${formatMinute(event.minute, event.extraMinute)} ${eventLabel(
                                event.kind,
                                event.detail
                            )}${event.playerName ? ` · ${event.playerName}` : ''}`}
                            className={`absolute -translate-x-1/2 ${event.side === 'home' ? 'top-1' : 'bottom-1'
                                }`}
                            style={{ left: markerPosition(event.minute) }}
                        >
                            <MomentDot kind={event.kind} />
                        </span>
                    ))}
                </div>

                <div className="relative mt-1 h-4">
                    {ticks.map((tick) => (
                        <span
                            key={tick}
                            className="absolute -translate-x-1/2 text-[10px] font-mono text-slate-500"
                            style={{ left: tickPosition(tick) }}
                        >
                            {tick}&apos;
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function MatchTimeline({
    events,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
}: MatchTimelineProps) {
    const [filter, setFilter] = useState<EventFilter>('all');
    const [isExpanded, setIsExpanded] = useState(true);

    const teams: Record<TeamSide, TimelineTeam> = { home: homeTeam, away: awayTeam };

    const analysis = useMemo(
        () => analyzeScores(events, homeScore, awayScore),
        [events, homeScore, awayScore]
    );

    const counts = useMemo(
        () => ({
            all: events.length,
            goals: events.filter((event) => matchesFilter(event.kind, 'goals')).length,
            cards: events.filter((event) => matchesFilter(event.kind, 'cards')).length,
            subs: events.filter((event) => matchesFilter(event.kind, 'subs')).length,
        }),
        [events]
    );

    const rows = useMemo(() => {
        const visible = events.filter((event) => matchesFilter(event.kind, filter));
        return buildRows(visible, analysis, { home: homeScore, away: awayScore });
    }, [events, filter, analysis, homeScore, awayScore]);

    const filterOptions = FILTERS.filter((option) => option.key === 'all' || counts[option.key] > 0);

    return (
        <section
            id="linea-de-tiempo"
            className="space-y-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 scroll-mt-24"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-white">Línea de tiempo</h3>
                            <p className="text-xs text-slate-400">Goles, tarjetas y cambios del partido.</p>
                        </div>
                    </div>

                    {/* Botón de contraer / desplegar para móviles */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-expanded={isExpanded}
                        className="sm:hidden p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition-colors"
                        aria-label="Alternar visibilidad de la línea de tiempo"
                    >
                        <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                    {/* Los botones de filtración solo se muestran si el componente está desplegado y hay opciones */}
                    {isExpanded && filterOptions.length > 2 && (
                        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                            {filterOptions.map((option) => {
                                const isActive = filter === option.key;
                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setFilter(option.key)}
                                        aria-pressed={isActive}
                                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${isActive
                                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                            : 'border border-slate-800 bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        {option.label} ({counts[option.key]})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Botón de contraer / desplegar para escritorio */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-expanded={isExpanded}
                        className="hidden sm:flex p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition-colors items-center justify-center shrink-0"
                        aria-label="Alternar visibilidad de la línea de tiempo"
                    >
                        <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Contenedor colapsable para el cuerpo del componente */}
            <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 space-y-6' : 'grid-rows-[0fr] opacity-0 overflow-hidden space-y-0'}`}>
                <div className="overflow-hidden space-y-6">
                    <KeyMoments events={events} homeTeam={homeTeam} awayTeam={awayTeam} />

                    <div>
                        {/* Cabecera de equipos (solo escritorio) */}
                        <div className={`hidden gap-x-3 pb-3 md:grid ${GRID_DESKTOP}`}>
                            <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-300">
                                <span className="truncate">{homeTeam.name}</span>
                                <TeamCrest name={homeTeam.name} crestUrl={homeTeam.crestUrl} size={22} className="rounded-md" />
                            </div>
                            <span />
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                <TeamCrest name={awayTeam.name} crestUrl={awayTeam.crestUrl} size={22} className="rounded-md" />
                                <span className="truncate">{awayTeam.name}</span>
                            </div>
                        </div>

                        <div className="relative">
                            <div
                                aria-hidden="true"
                                className="absolute bottom-0 left-7 top-0 w-px -translate-x-1/2 bg-slate-800 md:left-1/2"
                            />

                            <ol>
                                {rows.map((row) => {
                                    if (row.type === 'marker') {
                                        return (
                                            <li key={row.key} className="relative flex justify-center py-3">
                                                <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                                                    {row.label}
                                                    {row.score && (
                                                        <span className="font-mono normal-case text-emerald-400">
                                                            {row.score.home} - {row.score.away}
                                                        </span>
                                                    )}
                                                </span>
                                            </li>
                                        );
                                    }

                                    const { event, score } = row;
                                    const team = teams[event.side];

                                    return (
                                        <li
                                            key={row.key}
                                            className={`relative grid items-center gap-x-3 py-2 ${GRID_MOBILE} ${GRID_DESKTOP}`}
                                        >
                                            {/* Escritorio: eventos del local, a la izquierda */}
                                            <div className="hidden justify-end md:flex">
                                                {event.side === 'home' && (
                                                    <EventBody
                                                        event={event}
                                                        score={score}
                                                        align="right"
                                                        teamName={team.name}
                                                    />
                                                )}
                                            </div>

                                            {/* Minuto */}
                                            <span className="relative z-10 inline-flex min-w-[3rem] justify-center justify-self-center rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-slate-200">
                                                {formatMinute(event.minute, event.extraMinute)}
                                            </span>

                                            {/* Móvil: todos los eventos. Escritorio: solo los del visitante */}
                                            <div className={event.side === 'home' ? 'md:hidden' : ''}>
                                                <EventBody
                                                    event={event}
                                                    score={score}
                                                    align="left"
                                                    teamName={team.name}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}