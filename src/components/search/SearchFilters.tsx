'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import {
    buildSearchHref,
    type SearchCriteria,
    type SortOption,
    type StageCategoryKey,
} from '@/lib/search-params';

type FilterState = Omit<SearchCriteria, 'page'>;

interface SearchFiltersProps {
    initial: FilterState;
    seasons: string[];
    stageOptions: { key: StageCategoryKey; label: string }[];
}

const RATING_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const fieldClasses =
    'w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all';

const labelClasses = 'text-[11px] font-bold uppercase tracking-wider text-slate-400';

export default function SearchFilters({ initial, seasons, stageOptions }: SearchFiltersProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const signature = JSON.stringify(initial);
    const [syncedSignature, setSyncedSignature] = useState(signature);
    const [values, setValues] = useState<FilterState>(initial);

    // Si la URL cambia desde fuera (chips, botón atrás), se refleja en el formulario
    if (signature !== syncedSignature) {
        setSyncedSignature(signature);
        setValues(initial);
    }

    const navigate = (next: FilterState, mode: 'push' | 'replace') => {
        const href = buildSearchHref({ ...next, page: 1 });

        startTransition(() => {
            if (mode === 'push') {
                router.push(href);
            } else {
                router.replace(href);
            }
        });
    };

    const update = (patch: Partial<FilterState>) => {
        const next = { ...values, ...patch };
        setValues(next);
        navigate(next, 'replace');
    };

    const updateMin = (min: number | null) => {
        const max = min !== null && values.max !== null && min > values.max ? min : values.max;
        update({ min, max });
    };

    const updateMax = (max: number | null) => {
        const min = max !== null && values.min !== null && max < values.min ? max : values.min;
        update({ max, min });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        navigate({ ...values, q: values.q.trim() }, 'push');
    };

    const clearText = () => {
        const next = { ...values, q: '' };
        setValues(next);
        navigate(next, 'push');
    };

    const toNumber = (value: string) => (value ? Number(value) : null);

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-5 backdrop-blur-sm"
        >
            {/* Texto */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                        type="text"
                        value={values.q}
                        onChange={(event) => setValues({ ...values, q: event.target.value })}
                        placeholder="Equipo, estadio o fase… (ej. Barcelona Benfica)"
                        aria-label="Buscar"
                        autoComplete="off"
                        enterKeyHint="search"
                        maxLength={80}
                        className={`${fieldClasses} pl-10 pr-10`}
                    />
                    {values.q && (
                        <button
                            type="button"
                            onClick={clearText}
                            aria-label="Borrar búsqueda"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-all active:scale-95"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Buscar
                </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="filter-season" className={labelClasses}>
                        Temporada
                    </label>
                    <select
                        id="filter-season"
                        value={values.season ?? ''}
                        onChange={(event) => update({ season: event.target.value || null })}
                        className={fieldClasses}
                    >
                        <option value="">Todas</option>
                        {seasons.map((season) => (
                            <option key={season} value={season}>
                                {season}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="filter-stage" className={labelClasses}>
                        Fase
                    </label>
                    <select
                        id="filter-stage"
                        value={values.stage ?? ''}
                        onChange={(event) =>
                            update({ stage: (event.target.value || null) as StageCategoryKey | null })
                        }
                        className={fieldClasses}
                    >
                        <option value="">Todas</option>
                        {stageOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="filter-min" className={labelClasses}>
                        Rating mínimo
                    </label>
                    <select
                        id="filter-min"
                        value={values.min ?? ''}
                        onChange={(event) => updateMin(toNumber(event.target.value))}
                        className={fieldClasses}
                    >
                        <option value="">Cualquiera</option>
                        {RATING_VALUES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="filter-max" className={labelClasses}>
                        Rating máximo
                    </label>
                    <select
                        id="filter-max"
                        value={values.max ?? ''}
                        onChange={(event) => updateMax(toNumber(event.target.value))}
                        className={fieldClasses}
                    >
                        <option value="">Cualquiera</option>
                        {RATING_VALUES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5 col-span-2 lg:col-span-1">
                    <label htmlFor="filter-sort" className={labelClasses}>
                        Ordenar por
                    </label>
                    <select
                        id="filter-sort"
                        value={values.sort}
                        onChange={(event) => update({ sort: event.target.value as SortOption })}
                        className={fieldClasses}
                    >
                        <option value="recent">Más recientes</option>
                        <option value="rating">Mejor calificados</option>
                    </select>
                </div>
            </div>
        </form>
    );
}