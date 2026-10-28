import type { MatchEventType } from '@prisma/client';

/**
 * Conversión de los eventos de API-Football a la línea de tiempo de Matchbox.
 * La comparten `sync-events` (endpoint /fixtures/events) y `sync-daily` (/fixtures?id=,
 * que trae los mismos eventos junto con alineaciones y estadísticas).
 */

/**
 * En API-Football, en un cambio ("subst") `player` suele ser quien SALE y `assist` quien ENTRA.
 * Verifícalo con `npm run sync:events -- --probe=<id>` y cambia este valor si es al revés.
 */
export const SUB_PLAYER_IS_OUT = true;

export type Side = 'home' | 'away';

export interface ApiEvent {
    time?: { elapsed?: number | null; extra?: number | null } | null;
    team?: { id?: number | null } | null;
    player?: { name?: string | null } | null;
    assist?: { name?: string | null } | null;
    type?: string | null;
    detail?: string | null;
    comments?: string | null;
}

export interface DraftEvent {
    type: MatchEventType;
    side: Side;
    minute: number;
    extraMinute: number | null;
    playerName: string | null;
    relatedPlayerName: string | null;
    detail: string | null;
    order: number;
}

export const opposite = (side: Side): Side => (side === 'home' ? 'away' : 'home');

export function isShootout(event: ApiEvent) {
    return (event.comments ?? '').toLowerCase().includes('shootout');
}

export function classify(event: ApiEvent): MatchEventType | null {
    const type = (event.type ?? '').toLowerCase();
    const detail = (event.detail ?? '').toLowerCase();

    if (type === 'goal') {
        if (detail.includes('own')) return 'OWN_GOAL';
        if (detail.includes('missed')) return 'MISSED_PENALTY';
        if (detail.includes('penalty')) return 'PENALTY_GOAL';
        return 'GOAL';
    }

    if (type === 'card') {
        if (detail.includes('second')) return 'SECOND_YELLOW';
        if (detail.includes('red')) return 'RED_CARD';
        if (detail.includes('yellow')) return 'YELLOW_CARD';
        return null;
    }

    if (type === 'subst') return 'SUBSTITUTION';
    if (type === 'var') return 'VAR';

    return null;
}

export function buildDrafts(events: ApiEvent[], homeApiId: number, awayApiId: number) {
    const drafts: DraftEvent[] = [];
    let skipped = 0;
    let shootout = 0;

    events.forEach((event, order) => {
        if (isShootout(event)) {
            shootout += 1;
            return;
        }

        const type = classify(event);
        const teamId = event.team?.id;
        const side: Side | null =
            teamId === homeApiId ? 'home' : teamId === awayApiId ? 'away' : null;

        if (!type || !side) {
            skipped += 1;
            return;
        }

        const apiPlayer = event.player?.name ?? null;
        const apiAssist = event.assist?.name ?? null;

        let playerName = apiPlayer;
        let relatedPlayerName = apiAssist;

        // Normalizamos los cambios: playerName = quien entra, relatedPlayerName = quien sale
        if (type === 'SUBSTITUTION') {
            playerName = SUB_PLAYER_IS_OUT ? apiAssist : apiPlayer;
            relatedPlayerName = SUB_PLAYER_IS_OUT ? apiPlayer : apiAssist;
        }

        drafts.push({
            type,
            side,
            minute: event.time?.elapsed ?? 0,
            extraMinute: event.time?.extra ?? null,
            playerName,
            relatedPlayerName,
            detail: event.detail ?? null,
            order,
        });
    });

    drafts.sort(
        (a, b) =>
            a.minute - b.minute ||
            (a.extraMinute ?? 0) - (b.extraMinute ?? 0) ||
            a.order - b.order
    );

    return { drafts, skipped, shootout };
}

type OwnGoalMode = 'committer' | 'beneficiary';

function creditedScore(drafts: DraftEvent[], mode: OwnGoalMode) {
    const score = { home: 0, away: 0 };

    for (const draft of drafts) {
        if (draft.type === 'GOAL' || draft.type === 'PENALTY_GOAL') {
            score[draft.side] += 1;
        } else if (draft.type === 'OWN_GOAL') {
            score[mode === 'committer' ? opposite(draft.side) : draft.side] += 1;
        }
    }

    return score;
}

/**
 * No sabemos si en un gol en propia puerta la API indica el equipo del jugador o el que anota,
 * así que elegimos la interpretación que cuadra con el marcador final.
 * Tras esto, `side` de un OWN_GOAL es siempre el equipo al que se le acredita el gol.
 */
export function resolveOwnGoals(drafts: DraftEvent[], expected: { home: number; away: number }) {
    const matchesExpected = (score: { home: number; away: number }) =>
        score.home === expected.home && score.away === expected.away;

    let mode: OwnGoalMode = 'committer';
    if (
        !matchesExpected(creditedScore(drafts, 'committer')) &&
        matchesExpected(creditedScore(drafts, 'beneficiary'))
    ) {
        mode = 'beneficiary';
    }

    const resolved = drafts.map((draft) =>
        draft.type === 'OWN_GOAL' && mode === 'committer'
            ? { ...draft, side: opposite(draft.side) }
            : draft
    );

    const derived = creditedScore(drafts, mode);

    return { drafts: resolved, derived, consistent: matchesExpected(derived) };
}
