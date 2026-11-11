// Los jugadores se guardan con id "api-player-<id de API-Football>"; en la URL va solo el número
const PREFIX = 'api-player-';

export function playerHref(playerId: string): string {
    return `/players/${playerId.startsWith(PREFIX) ? playerId.slice(PREFIX.length) : playerId}`;
}

/** Parámetro de la URL -> id en la base de datos. Solo acepta números (o un id ya completo). */
export function playerIdFromParam(param: string): string | null {
    if (/^\d{1,10}$/.test(param)) return `${PREFIX}${param}`;
    if (param.startsWith(PREFIX)) return param;
    return null;
}

// La plantilla usa nombres en inglés y las alineaciones, letras
const POSITION_NAMES: Record<string, string> = {
    G: 'Portero',
    D: 'Defensa',
    M: 'Mediocampista',
    F: 'Delantero',
    Goalkeeper: 'Portero',
    Defender: 'Defensa',
    Midfielder: 'Mediocampista',
    Attacker: 'Delantero',
};

export function positionLabel(position: string | null | undefined): string | null {
    return position ? POSITION_NAMES[position] ?? position : null;
}

/** 2024 -> "2024/25" */
const seasonLabel = (year: number) => `${year}/${String(year + 1).slice(-2)}`;

/**
 * Temporadas tal como llegan de API-Football -> años enteros, sin repetir, del más reciente al más antiguo.
 * La API a veces las manda como texto ("2024") o con valores sueltos que no son años.
 */
export function normalizeSeasons(values: unknown): number[] {
    if (!Array.isArray(values)) return [];
    const years = values.map(Number).filter((year) => Number.isInteger(year) && year >= 1850 && year <= 2200);
    return [...new Set(years)].sort((a, b) => b - a);
}

/** [2026, 2025, 2024, 2021] -> "2021/22 · 2024/25 – 2026/27" (agrupa temporadas seguidas) */
export function formatSeasonRanges(seasons: number[]): string {
    const sorted = [...new Set(seasons)].sort((a, b) => a - b);
    const ranges: [number, number][] = [];
    for (const year of sorted) {
        const last = ranges[ranges.length - 1];
        if (last && year === last[1] + 1) last[1] = year;
        else ranges.push([year, year]);
    }
    return ranges
        .map(([from, to]) => (from === to ? seasonLabel(from) : `${seasonLabel(from)} – ${seasonLabel(to)}`))
        .join(' · ');
}
