'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Search, User, X } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import { buildSearchHref, type SuggestionsPayload } from '@/lib/search-params';
import { playerHref } from '@/lib/players';

interface SuggestionsResponse {
    q: string;
    data: SuggestionsPayload;
    failed: boolean;
}

export default function GlobalSearch() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<SuggestionsResponse | null>(null);
    const [active, setActive] = useState(-1);

    const trimmed = query.trim();
    const canSearch = trimmed.length >= 2;
    const current = canSearch && response?.q === trimmed ? response : null;
    const loading = canSearch && !current;

    const teams = current?.data.teams ?? [];
    const players = current?.data.players ?? [];
    const matches = current?.data.matches ?? [];
    // Orden de navegación con el teclado: equipos, jugadores y partidos
    const items = [
        ...teams.map((team) => ({ key: `team-${team.id}`, href: `/teams/${team.slug}` })),
        ...players.map((player) => ({ key: `player-${player.id}`, href: playerHref(player.id) })),
        ...matches.map((match) => ({ key: `match-${match.id}`, href: `/matches/${match.id}` })),
    ];
    const activeIndex = Math.min(active, items.length - 1);
    const fullSearchHref = buildSearchHref({ q: trimmed });

    const close = useCallback(() => {
        setOpen(false);
        setQuery('');
        setActive(-1);
        setResponse(null);
    }, []);

    // Atajos globales: "/" y Ctrl/Cmd+K abren; Escape cierra
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && open) {
                close();
                return;
            }

            const target = event.target as HTMLElement | null;
            const isTyping =
                !!target &&
                (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

            const slash =
                event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey;
            const ctrlK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

            if (slash || ctrlK) {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, close]);

    // Bloquear scroll del fondo y enfocar el campo al abrir
    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        inputRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    // Sugerencias con debounce
    useEffect(() => {
        const q = query.trim();
        if (!open || q.length < 2) return;

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error('Respuesta no válida');

                const data = (await res.json()) as SuggestionsPayload;
                setResponse({ q, data, failed: false });
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                setResponse({ q, data: { teams: [], players: [], matches: [] }, failed: true });
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, open]);

    const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (items.length > 0) setActive(activeIndex + 1 >= items.length ? 0 : activeIndex + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (items.length > 0) setActive(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (!trimmed) return;

            router.push(activeIndex >= 0 ? items[activeIndex].href : fullSearchHref);
            close();
        }
    };

    const rowClasses = (index: number) =>
        `flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors ${activeIndex === index ? 'bg-slate-800' : 'hover:bg-slate-800/70'
        }`;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Buscar equipos y partidos"
                title="Buscar (/)"
                className="flex items-center gap-2 h-10 px-3 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-slate-900/70 transition-all xl:w-56 xl:border xl:border-slate-800 xl:bg-slate-900/60"
            >
                <Search className="w-4.5 h-4.5 shrink-0" />
                <span className="hidden xl:inline text-sm text-slate-300">Buscar…</span>
                <kbd className="hidden xl:inline ml-auto rounded border border-slate-700 px-1.5 text-[10px] font-mono text-slate-500">
                    /
                </kbd>
            </button>

            {open &&
                createPortal(
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Buscar en Matchbox"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) close();
                        }}
                        className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/80 backdrop-blur-sm px-4 pt-[8vh] sm:pt-[12vh]"
                    >
                        <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                            {/* Campo de búsqueda */}
                            <div className="flex items-center gap-3 border-b border-slate-800 px-4">
                                <Search className="w-4 h-4 text-slate-500 shrink-0" />
                                <input
                                    ref={inputRef}
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setActive(-1);
                                    }}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder="Buscar equipos o partidos…"
                                    aria-label="Buscar equipos o partidos"
                                    autoComplete="off"
                                    spellCheck={false}
                                    enterKeyHint="search"
                                    maxLength={80}
                                    className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                                />
                                {loading && (
                                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
                                )}
                                <button
                                    type="button"
                                    onClick={close}
                                    aria-label="Cerrar búsqueda"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Resultados */}
                            <div className="max-h-[60vh] overflow-y-auto p-2">
                                {!canSearch && (
                                    <div className="px-3 py-6 text-center space-y-3">
                                        <p className="text-sm text-slate-400">
                                            Escribe al menos 2 letras para buscar equipos y partidos.
                                        </p>
                                        <Link
                                            href="/search"
                                            onClick={close}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                        >
                                            Explorar con filtros
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                )}

                                {canSearch && loading && (
                                    <p className="px-3 py-6 text-center text-sm text-slate-500">Buscando…</p>
                                )}

                                {current?.failed && (
                                    <p className="px-3 py-6 text-center text-sm text-rose-400">
                                        No se pudo buscar ahora. Inténtalo de nuevo.
                                    </p>
                                )}

                                {current && !current.failed && items.length === 0 && (
                                    <div className="px-3 py-6 text-center space-y-3">
                                        <p className="text-sm text-slate-400">
                                            Sin resultados para «{trimmed}».
                                        </p>
                                        <Link
                                            href={fullSearchHref}
                                            onClick={close}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                        >
                                            Abrir búsqueda con filtros
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                )}

                                {teams.length > 0 && (
                                    <div className="pb-2">
                                        <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Equipos
                                        </p>
                                        {teams.map((team, index) => (
                                            <Link
                                                key={team.id}
                                                href={`/teams/${team.slug}`}
                                                onClick={close}
                                                onMouseEnter={() => setActive(index)}
                                                className={rowClasses(index)}
                                            >
                                                <span className="flex items-center gap-3 min-w-0">
                                                    <TeamCrest
                                                        name={team.name}
                                                        crestUrl={team.crestUrl}
                                                        size={28}
                                                        className="rounded-lg"
                                                    />
                                                    <span className="truncate text-sm font-bold text-white">
                                                        {team.name}
                                                    </span>
                                                </span>
                                                {team.country && (
                                                    <span className="text-[11px] text-slate-500 shrink-0">
                                                        {team.country}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {players.length > 0 && (
                                    <div className="pb-2">
                                        <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Jugadores
                                        </p>
                                        {players.map((player, index) => {
                                            const rowIndex = teams.length + index;
                                            return (
                                                <Link
                                                    key={player.id}
                                                    href={playerHref(player.id)}
                                                    onClick={close}
                                                    onMouseEnter={() => setActive(rowIndex)}
                                                    className={rowClasses(rowIndex)}
                                                >
                                                    <span className="flex items-center gap-3 min-w-0">
                                                        <span className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                                                            {player.photoUrl ? (
                                                                <Image src={player.photoUrl} alt="" fill sizes="28px" className="object-cover" />
                                                            ) : (
                                                                <User className="w-3.5 h-3.5 text-slate-500 absolute inset-0 m-auto" />
                                                            )}
                                                        </span>
                                                        <span className="truncate text-sm font-bold text-white">{player.name}</span>
                                                    </span>
                                                    {player.teamName && (
                                                        <span className="text-[11px] text-slate-500 truncate max-w-[40%]">{player.teamName}</span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {matches.length > 0 && (
                                    <div className="pb-2">
                                        <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Partidos
                                        </p>
                                        {matches.map((match, index) => {
                                            const rowIndex = teams.length + players.length + index;
                                            return (
                                                <Link
                                                    key={match.id}
                                                    href={`/matches/${match.id}`}
                                                    onClick={close}
                                                    onMouseEnter={() => setActive(rowIndex)}
                                                    className={rowClasses(rowIndex)}
                                                >
                                                    <span className="min-w-0 space-y-0.5">
                                                        <span className="flex items-center gap-2 text-sm font-bold text-white">
                                                            <TeamCrest
                                                                name={match.homeTeam.name}
                                                                crestUrl={match.homeTeam.crestUrl}
                                                                size={20}
                                                                className="rounded-md"
                                                            />
                                                            <span className="truncate">{match.homeTeam.name}</span>
                                                            <span className="tabular-nums text-xs text-emerald-400 shrink-0">
                                                                {match.homeScore} - {match.awayScore}
                                                            </span>
                                                            <span className="truncate">{match.awayTeam.name}</span>
                                                            <TeamCrest
                                                                name={match.awayTeam.name}
                                                                crestUrl={match.awayTeam.crestUrl}
                                                                size={20}
                                                                className="rounded-md"
                                                            />
                                                        </span>
                                                        <span className="block truncate text-[11px] text-slate-500">
                                                            {[match.stage, match.season].filter(Boolean).join(' • ')}
                                                        </span>
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {current && !current.failed && items.length > 0 && (
                                    <Link
                                        href={fullSearchHref}
                                        onClick={close}
                                        className="flex items-center justify-between gap-3 rounded-xl border-t border-slate-800 px-3 py-3 text-xs font-bold text-emerald-400 hover:bg-slate-800/70 transition-colors"
                                    >
                                        <span className="truncate">Ver todos los resultados para «{trimmed}»</span>
                                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                    </Link>
                                )}
                            </div>

                            {/* Ayuda de teclado (solo escritorio) */}
                            <div className="hidden sm:flex items-center gap-4 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
                                <span>↑↓ navegar</span>
                                <span>↵ abrir</span>
                                <span>esc cerrar</span>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}