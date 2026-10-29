'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import { normalizeText } from '@/lib/search-params';

export interface DirectoryTeam {
    id: string;
    name: string;
    slug: string;
    crestUrl: string | null;
    country: string | null;
    matches: number;
    /** Nombre, nombre corto y apodos normalizados ("psg", "barça"...) */
    searchText: string;
}

const NO_COUNTRY = 'Otros';

export default function TeamsDirectory({ teams }: { teams: DirectoryTeam[] }) {
    const [query, setQuery] = useState('');

    // Filtro instantáneo por nombre, apodo o país, agrupado por país
    const groups = useMemo(() => {
        const term = normalizeText(query);
        const filtered = term
            ? teams.filter((team) => team.searchText.includes(term) || normalizeText(team.country ?? '').includes(term))
            : teams;

        const byCountry = new Map<string, DirectoryTeam[]>();
        for (const team of filtered) {
            const country = team.country ?? NO_COUNTRY;
            byCountry.set(country, [...(byCountry.get(country) ?? []), team]);
        }
        return [...byCountry.entries()].sort(([a], [b]) => (a === NO_COUNTRY ? 1 : b === NO_COUNTRY ? -1 : a.localeCompare(b, 'es')));
    }, [query, teams]);

    const total = groups.reduce((acc, [, list]) => acc + list.length, 0);

    return (
        <div className="space-y-8">
            <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, apodo o país…"
                    aria-label="Buscar equipos"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <p className="sr-only" aria-live="polite">{total} equipos</p>

            {groups.length === 0 ? (
                <p className="text-center text-slate-400 py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
                    Ningún equipo coincide con «{query}».
                </p>
            ) : (
                groups.map(([country, list]) => (
                    <section key={country} className="space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {country} <span className="text-slate-600">({list.length})</span>
                        </h2>
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {list.map((team) => (
                                <Link
                                    key={team.id}
                                    href={`/teams/${team.slug}`}
                                    className="group flex items-center gap-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 p-3.5 transition-colors"
                                >
                                    <TeamCrest name={team.name} crestUrl={team.crestUrl} size={36} />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                            {team.name}
                                        </span>
                                        <span className="block text-[11px] text-slate-500">
                                            {team.matches} {team.matches === 1 ? 'partido' : 'partidos'}
                                        </span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
