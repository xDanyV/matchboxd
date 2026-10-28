// Calificaciones de 0.5 a 10 en pasos de medio punto (7.5, 8, 8.5...)
export const RATING_MIN = 0.5;
export const RATING_MAX = 10;
export const RATING_STEP = 0.5;

export function isValidRating(value: unknown): value is number {
    return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= RATING_MIN &&
        value <= RATING_MAX &&
        Number.isInteger(value / RATING_STEP)
    );
}

/** 8 -> "8", 7.5 -> "7.5" (para la nota propia; los promedios usan toFixed(1)). */
export function formatRating(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
