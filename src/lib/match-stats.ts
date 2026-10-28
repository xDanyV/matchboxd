/**
 * Claves propias para las estadísticas que trae API-Football. Se guardan así en
 * MatchTeamStats.stats y MatchPlayer.stats para no depender de los textos de la API.
 * Sin dependencias de Prisma: lo usan tanto el sync (Node) como la interfaz.
 */

export type TeamStatKey =
    | 'possession' | 'xg' | 'shotsTotal' | 'shotsOnGoal' | 'shotsOffGoal' | 'shotsBlocked'
    | 'shotsInsideBox' | 'shotsOutsideBox' | 'passesTotal' | 'passesAccurate' | 'passAccuracy'
    | 'corners' | 'fouls' | 'offsides' | 'yellowCards' | 'redCards' | 'saves' | 'goalsPrevented';

export type TeamStats = Partial<Record<TeamStatKey, number>>;

// Texto que usa la API -> clave propia
const API_TEAM_STAT_KEYS: Record<string, TeamStatKey> = {
    'Ball Possession': 'possession',
    expected_goals: 'xg',
    'Total Shots': 'shotsTotal',
    'Shots on Goal': 'shotsOnGoal',
    'Shots off Goal': 'shotsOffGoal',
    'Blocked Shots': 'shotsBlocked',
    'Shots insidebox': 'shotsInsideBox',
    'Shots outsidebox': 'shotsOutsideBox',
    'Total passes': 'passesTotal',
    'Passes accurate': 'passesAccurate',
    'Passes %': 'passAccuracy',
    'Corner Kicks': 'corners',
    Fouls: 'fouls',
    Offsides: 'offsides',
    'Yellow Cards': 'yellowCards',
    'Red Cards': 'redCards',
    'Goalkeeper Saves': 'saves',
    goals_prevented: 'goalsPrevented',
};

/** "59%" -> 59, "3.12" -> 3.12, null -> se omite. */
function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : parseFloat(String(value).replace('%', ''));
    return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeTeamStats(list: { type: string; value: unknown }[]): TeamStats {
    const stats: TeamStats = {};
    for (const { type, value } of list) {
        const key = API_TEAM_STAT_KEYS[type];
        const number = toNumber(value);
        if (key && number !== null) stats[key] = number;
    }
    return stats;
}

/** Orden y etiquetas de la comparativa del partido. `percent`: se muestra con %. */
export const TEAM_STAT_ROWS: { key: TeamStatKey; label: string; percent?: boolean; decimals?: number }[] = [
    { key: 'possession', label: 'Posesión', percent: true },
    { key: 'xg', label: 'Goles esperados (xG)', decimals: 2 },
    { key: 'shotsTotal', label: 'Remates' },
    { key: 'shotsOnGoal', label: 'Remates al arco' },
    { key: 'shotsInsideBox', label: 'Remates dentro del área' },
    { key: 'passesTotal', label: 'Pases' },
    { key: 'passAccuracy', label: 'Precisión de pases', percent: true },
    { key: 'corners', label: 'Córners' },
    { key: 'fouls', label: 'Faltas' },
    { key: 'offsides', label: 'Fueras de juego' },
    { key: 'saves', label: 'Atajadas' },
    { key: 'yellowCards', label: 'Tarjetas amarillas' },
    { key: 'redCards', label: 'Tarjetas rojas' },
];

// -------------------------------------------------------------
// Estadísticas de un jugador en un partido
// -------------------------------------------------------------

export interface PlayerMatchStats {
    goals?: number;
    assists?: number;
    conceded?: number;
    saves?: number;
    shotsTotal?: number;
    shotsOn?: number;
    passesTotal?: number;
    passesKey?: number;
    /** La API lo llama "accuracy" pero es la cantidad de pases acertados, no un porcentaje */
    passesAccurate?: number;
    tackles?: number;
    interceptions?: number;
    duelsTotal?: number;
    duelsWon?: number;
    dribblesAttempts?: number;
    dribblesSuccess?: number;
    foulsDrawn?: number;
    foulsCommitted?: number;
    yellowCards?: number;
    redCards?: number;
    penaltyScored?: number;
    penaltyMissed?: number;
    penaltySaved?: number;
}

/** Recibe `statistics[0]` de /fixtures/players y lo aplana, omitiendo lo que venga en null. */
export function normalizePlayerStats(raw: Record<string, Record<string, unknown> | undefined>): PlayerMatchStats {
    const pick = (group: string, field: string) => toNumber(raw[group]?.[field]);
    const entries: [keyof PlayerMatchStats, number | null][] = [
        ['goals', pick('goals', 'total')],
        ['assists', pick('goals', 'assists')],
        ['conceded', pick('goals', 'conceded')],
        ['saves', pick('goals', 'saves')],
        ['shotsTotal', pick('shots', 'total')],
        ['shotsOn', pick('shots', 'on')],
        ['passesTotal', pick('passes', 'total')],
        ['passesKey', pick('passes', 'key')],
        ['passesAccurate', pick('passes', 'accuracy')],
        ['tackles', pick('tackles', 'total')],
        ['interceptions', pick('tackles', 'interceptions')],
        ['duelsTotal', pick('duels', 'total')],
        ['duelsWon', pick('duels', 'won')],
        ['dribblesAttempts', pick('dribbles', 'attempts')],
        ['dribblesSuccess', pick('dribbles', 'success')],
        ['foulsDrawn', pick('fouls', 'drawn')],
        ['foulsCommitted', pick('fouls', 'committed')],
        ['yellowCards', pick('cards', 'yellow')],
        ['redCards', pick('cards', 'red')],
        ['penaltyScored', pick('penalty', 'scored')],
        ['penaltyMissed', pick('penalty', 'missed')],
        ['penaltySaved', pick('penalty', 'saved')],
    ];

    const stats: PlayerMatchStats = {};
    for (const [key, value] of entries) {
        if (value !== null) stats[key] = value;
    }
    return stats;
}

export const POSITION_LABELS: Record<string, string> = {
    G: 'Portero',
    D: 'Defensa',
    M: 'Mediocampista',
    F: 'Delantero',
};

/** Color de la nota de la API, como en las apps de estadísticas. */
export function ratingTone(rating: number | null | undefined): 'elite' | 'good' | 'average' | 'poor' | 'none' {
    if (rating === null || rating === undefined) return 'none';
    if (rating >= 8) return 'elite';
    if (rating >= 7) return 'good';
    if (rating >= 6) return 'average';
    return 'poor';
}
