import type { WatchMethod } from '@prisma/client';

// Catálogo compartido por cliente y servidor (no importa Prisma en tiempo de ejecución)
export const WATCH_METHODS: { value: WatchMethod; label: string }[] = [
    { value: 'STADIUM', label: 'En el estadio' },
    { value: 'TV', label: 'Por TV' },
    { value: 'STREAMING', label: 'Streaming' },
    { value: 'REPLAY', label: 'Repetición' },
    { value: 'HIGHLIGHTS', label: 'Resumen' },
];

export function isWatchMethod(value: unknown): value is WatchMethod {
    return WATCH_METHODS.some((method) => method.value === value);
}

export function getWatchMethodLabel(value: WatchMethod | null | undefined): string | null {
    return WATCH_METHODS.find((method) => method.value === value)?.label ?? null;
}

/** Fecha local en formato YYYY-MM-DD, el que usan los <input type="date">. */
export function toDateInputValue(date: Date): string {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** Formatea una columna @db.Date: se guarda a medianoche UTC, así que se lee en UTC. */
export function formatWatchedOn(date: Date, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
    return new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(new Date(date));
}
