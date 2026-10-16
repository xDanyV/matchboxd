export type MatchEventKind =
    | 'GOAL'
    | 'PENALTY_GOAL'
    | 'OWN_GOAL'
    | 'MISSED_PENALTY'
    | 'YELLOW_CARD'
    | 'SECOND_YELLOW'
    | 'RED_CARD'
    | 'SUBSTITUTION'
    | 'VAR';

export type TeamSide = 'home' | 'away';
export type EventFilter = 'all' | 'goals' | 'cards' | 'subs';

export interface Score {
    home: number;
    away: number;
}

export interface TimelineEvent {
    id: string;
    kind: MatchEventKind;
    side: TeamSide;
    minute: number;
    extraMinute: number | null;
    /** Goles: goleador. Tarjetas: jugador. Cambios: quien entra. */
    playerName: string | null;
    /** Goles: asistente. Cambios: quien sale. */
    relatedPlayerName: string | null;
    detail: string | null;
}

export type TimelineRow =
    | { type: 'event'; key: string; event: TimelineEvent; score: Score | null }
    | { type: 'marker'; key: string; label: string; score: Score | null };

export interface ScoreAnalysis {
    after: Map<string, Score>;
    halftime: Score;
    regular: Score;
    /** true si los goles de los eventos suman el marcador final del partido */
    consistent: boolean;
}

const SCORING_KINDS: MatchEventKind[] = ['GOAL', 'PENALTY_GOAL', 'OWN_GOAL'];
const GOAL_FILTER_KINDS: MatchEventKind[] = [...SCORING_KINDS, 'MISSED_PENALTY'];
const CARD_KINDS: MatchEventKind[] = ['YELLOW_CARD', 'SECOND_YELLOW', 'RED_CARD'];
const KEY_KINDS: MatchEventKind[] = [...GOAL_FILTER_KINDS, 'RED_CARD', 'SECOND_YELLOW'];

export const isScoringGoal = (kind: MatchEventKind) => SCORING_KINDS.includes(kind);
export const isKeyMoment = (kind: MatchEventKind) => KEY_KINDS.includes(kind);

export function matchesFilter(kind: MatchEventKind, filter: EventFilter) {
    switch (filter) {
        case 'goals':
            return GOAL_FILTER_KINDS.includes(kind);
        case 'cards':
            return CARD_KINDS.includes(kind);
        case 'subs':
            return kind === 'SUBSTITUTION';
        default:
            return true;
    }
}

export function formatMinute(minute: number, extraMinute: number | null) {
    return extraMinute && extraMinute > 0 ? `${minute}+${extraMinute}'` : `${minute}'`;
}

const KIND_LABELS: Record<Exclude<MatchEventKind, 'VAR'>, string> = {
    GOAL: 'Gol',
    PENALTY_GOAL: 'Gol de penal',
    OWN_GOAL: 'Gol en propia puerta',
    MISSED_PENALTY: 'Penal fallado',
    YELLOW_CARD: 'Tarjeta amarilla',
    SECOND_YELLOW: 'Segunda amarilla',
    RED_CARD: 'Tarjeta roja',
    SUBSTITUTION: 'Cambio',
};

function varLabel(detail: string | null) {
    const text = (detail ?? '').toLowerCase();

    if (/cancel|disallow/.test(text)) return 'Gol anulado por el VAR';
    if (text.includes('penalty')) return 'Penal confirmado por el VAR';
    if (text.includes('card')) return 'Revisión de tarjeta (VAR)';

    return 'Revisión del VAR';
}

export function eventLabel(kind: MatchEventKind, detail: string | null) {
    return kind === 'VAR' ? varLabel(detail) : KIND_LABELS[kind];
}

/** Marcador acumulado tras cada gol, y marcadores al descanso y a los 90 minutos. */
export function analyzeScores(
    events: TimelineEvent[],
    homeScore: number,
    awayScore: number
): ScoreAnalysis {
    const after = new Map<string, Score>();
    const running: Score = { home: 0, away: 0 };
    const halftime: Score = { home: 0, away: 0 };
    const regular: Score = { home: 0, away: 0 };

    for (const event of events) {
        if (!isScoringGoal(event.kind)) continue;

        running[event.side] += 1;
        after.set(event.id, { ...running });

        if (event.minute <= 45) halftime[event.side] += 1;
        if (event.minute <= 90) regular[event.side] += 1;
    }

    return {
        after,
        halftime,
        regular,
        consistent: running.home === homeScore && running.away === awayScore,
    };
}

/** Intercala los separadores (descanso, fin de los 90, final) entre los eventos visibles. */
export function buildRows(
    visible: TimelineEvent[],
    analysis: ScoreAnalysis,
    finalScore: Score
): TimelineRow[] {
    const rows: TimelineRow[] = [];
    let passedHalf = false;
    let passedRegular = false;

    for (const event of visible) {
        if (!passedHalf && event.minute > 45) {
            passedHalf = true;
            if (rows.length > 0) {
                rows.push({
                    type: 'marker',
                    key: 'marker-half',
                    label: 'Descanso',
                    score: analysis.consistent ? analysis.halftime : null,
                });
            }
        }

        if (!passedRegular && event.minute > 90) {
            passedRegular = true;
            if (rows.length > 0) {
                rows.push({
                    type: 'marker',
                    key: 'marker-regular',
                    label: 'Fin del tiempo reglamentario',
                    score: analysis.consistent ? analysis.regular : null,
                });
            }
        }

        rows.push({
            type: 'event',
            key: event.id,
            event,
            score: analysis.consistent ? (analysis.after.get(event.id) ?? null) : null,
        });
    }

    if (rows.length > 0) {
        rows.push({ type: 'marker', key: 'marker-final', label: 'Final', score: finalScore });
    }

    return rows;
}