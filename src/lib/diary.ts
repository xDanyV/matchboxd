import type { WatchMethod } from '@prisma/client';
import { isWatchMethod } from '@/lib/watch-methods';

export interface MatchLogInput {
    /** Fecha en formato YYYY-MM-DD */
    watchedOn: string;
    method?: WatchMethod | null;
    isRewatch?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida una entrada de diario y la convierte a datos de Prisma.
 * Se toma un día de margen en ambos extremos por las zonas horarias del usuario.
 */
export function parseMatchLogInput(input: MatchLogInput, matchDate: Date) {
    if (!DATE_REGEX.test(input.watchedOn)) {
        throw new Error('La fecha en que viste el partido no es válida.');
    }

    const watchedOn = new Date(`${input.watchedOn}T00:00:00.000Z`);
    if (Number.isNaN(watchedOn.getTime())) {
        throw new Error('La fecha en que viste el partido no es válida.');
    }

    if (watchedOn.getTime() > Date.now() + DAY_MS) {
        throw new Error('La fecha no puede estar en el futuro.');
    }

    if (watchedOn.getTime() < matchDate.getTime() - DAY_MS) {
        throw new Error('No pudiste ver el partido antes de que se jugara.');
    }

    if (input.method != null && !isWatchMethod(input.method)) {
        throw new Error('La forma en que viste el partido no es válida.');
    }

    return {
        watchedOn,
        method: input.method ?? null,
        isRewatch: Boolean(input.isRewatch),
    };
}
