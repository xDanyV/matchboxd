/**
 * Arma el cuadro de la fase eliminatoria a partir de los partidos guardados:
 * agrupa ida y vuelta en una llave, suma el global y decide quién pasó.
 */

export const KNOCKOUT_ROUNDS = [
    { stage: 'Knockout Round Play-offs', label: 'Playoff' },
    { stage: 'Round of 16', label: 'Octavos' },
    { stage: 'Quarter-finals', label: 'Cuartos' },
    { stage: 'Semi-finals', label: 'Semifinales' },
    { stage: 'Final', label: 'Final' },
] as const;

export interface KnockoutTeam {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    crestUrl: string | null;
}

export interface KnockoutMatch {
    id: string;
    date: Date;
    stage: string | null;
    homeScore: number;
    awayScore: number;
    homePenalties: number | null;
    awayPenalties: number | null;
    homeTeam: KnockoutTeam;
    awayTeam: KnockoutTeam;
}

export interface KnockoutTie {
    key: string;
    teams: [KnockoutTeam, KnockoutTeam];
    /** Goles en el global, en el orden de `teams` */
    aggregate: [number, number];
    /** Tanda de penales del último partido, si la hubo */
    penalties: [number, number] | null;
    winnerId: string | null;
    legs: KnockoutMatch[];
}

export interface KnockoutRound {
    stage: string;
    label: string;
    ties: KnockoutTie[];
}

const pairKey = (a: string, b: string) => [a, b].sort().join(':');

function buildTie(legs: KnockoutMatch[]): KnockoutTie {
    const sorted = [...legs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const first = sorted[0];
    // El local de la ida va primero, como se suele mostrar una llave
    const teams: [KnockoutTeam, KnockoutTeam] = [first.homeTeam, first.awayTeam];
    const aggregate: [number, number] = [0, 0];

    for (const leg of sorted) {
        const homeIndex = leg.homeTeam.id === teams[0].id ? 0 : 1;
        aggregate[homeIndex] += leg.homeScore;
        aggregate[1 - homeIndex] += leg.awayScore;
    }

    const last = sorted[sorted.length - 1];
    let penalties: [number, number] | null = null;
    if (last.homePenalties !== null && last.awayPenalties !== null) {
        penalties = last.homeTeam.id === teams[0].id
            ? [last.homePenalties, last.awayPenalties]
            : [last.awayPenalties, last.homePenalties];
    }

    return { key: pairKey(teams[0].id, teams[1].id), teams, aggregate, penalties, winnerId: null, legs: sorted };
}

function decideWinner(tie: KnockoutTie, nextRoundTeamIds: Set<string> | null): string | null {
    // 1) El que aparece en la siguiente ronda: no depende de tener el detalle de los penales
    if (nextRoundTeamIds) {
        const advanced = tie.teams.find((team) => nextRoundTeamIds.has(team.id));
        if (advanced) return advanced.id;
    }
    // 2) Global (sin gol de visitante: se eliminó en 2021-22)
    if (tie.aggregate[0] !== tie.aggregate[1]) return tie.teams[tie.aggregate[0] > tie.aggregate[1] ? 0 : 1].id;
    // 3) Penales
    if (tie.penalties && tie.penalties[0] !== tie.penalties[1]) return tie.teams[tie.penalties[0] > tie.penalties[1] ? 0 : 1].id;
    return null;
}

export function buildBracket(matches: KnockoutMatch[]): KnockoutRound[] {
    const rounds = KNOCKOUT_ROUNDS.map(({ stage, label }) => {
        const byPair = new Map<string, KnockoutMatch[]>();
        for (const match of matches.filter((m) => m.stage === stage)) {
            const key = pairKey(match.homeTeam.id, match.awayTeam.id);
            byPair.set(key, [...(byPair.get(key) ?? []), match]);
        }
        return { stage, label, ties: [...byPair.values()].map(buildTie) as KnockoutTie[] };
    }).filter((round) => round.ties.length > 0);

    // Ganador de cada llave (mirando quién aparece en la ronda siguiente)
    rounds.forEach((round, i) => {
        const next = rounds[i + 1];
        const nextIds = next ? new Set(next.ties.flatMap((tie) => tie.teams.map((team) => team.id))) : null;
        for (const tie of round.ties) tie.winnerId = decideWinner(tie, nextIds);
    });

    // Orden del cuadro: desde la final hacia atrás, cada llave se coloca junto a la que alimenta
    for (let i = rounds.length - 2; i >= 0; i--) {
        const current = rounds[i];
        const next = rounds[i + 1];
        const ordered: KnockoutTie[] = [];
        for (const nextTie of next.ties) {
            for (const team of nextTie.teams) {
                const feeder = current.ties.find((tie) => tie.winnerId === team.id && !ordered.includes(tie));
                if (feeder) ordered.push(feeder);
            }
        }
        current.ties = [...ordered, ...current.ties.filter((tie) => !ordered.includes(tie))];
    }

    return rounds;
}
