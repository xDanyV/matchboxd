import { describe, expect, it } from 'vitest';
import { buildBracket, type KnockoutMatch, type KnockoutTeam } from './knockout';

const team = (id: string): KnockoutTeam => ({ id, name: id, shortName: null, slug: id, crestUrl: null });

let nextId = 0;
function match(
    stage: string,
    date: string,
    home: string,
    away: string,
    score: [number, number],
    penalties: [number, number] | null = null,
): KnockoutMatch {
    return {
        id: `m${nextId++}`,
        date: new Date(date),
        stage,
        homeScore: score[0],
        awayScore: score[1],
        homePenalties: penalties?.[0] ?? null,
        awayPenalties: penalties?.[1] ?? null,
        homeTeam: team(home),
        awayTeam: team(away),
    };
}

describe('buildBracket', () => {
    it('suma el global de ida y vuelta con el local de la ida primero', () => {
        const [round] = buildBracket([
            match('Round of 16', '2024-03-05', 'B', 'A', [1, 2]),
            match('Round of 16', '2024-02-13', 'A', 'B', [0, 0]),
        ]);

        const [tie] = round.ties;
        expect(tie.teams.map((t) => t.id)).toEqual(['A', 'B']);
        expect(tie.aggregate).toEqual([2, 1]);
        expect(tie.legs.map((leg) => leg.homeTeam.id)).toEqual(['A', 'B']);
        expect(tie.winnerId).toBe('A');
    });

    it('decide por penales cuando el global empata', () => {
        const [round] = buildBracket([
            match('Quarter-finals', '2024-04-09', 'A', 'B', [3, 3]),
            match('Quarter-finals', '2024-04-17', 'B', 'A', [1, 1], [3, 4]),
        ]);

        const [tie] = round.ties;
        expect(tie.aggregate).toEqual([4, 4]);
        // Penales en el orden de `teams` (A, B), aunque en la vuelta A era visitante
        expect(tie.penalties).toEqual([4, 3]);
        expect(tie.winnerId).toBe('A');
    });

    it('usa la ronda siguiente aunque falten los penales en los datos', () => {
        const rounds = buildBracket([
            match('Semi-finals', '2024-04-30', 'A', 'B', [1, 1]),
            match('Semi-finals', '2024-05-08', 'B', 'A', [0, 0]),
            match('Final', '2024-06-01', 'B', 'C', [0, 2]),
        ]);

        expect(rounds.map((r) => r.label)).toEqual(['Semifinales', 'Final']);
        expect(rounds[0].ties[0].winnerId).toBe('B');
        expect(rounds[1].ties[0].winnerId).toBe('C');
    });

    it('ordena cada ronda según la llave que alimenta en la siguiente', () => {
        const rounds = buildBracket([
            match('Semi-finals', '2024-04-30', 'C', 'D', [2, 0]),
            match('Semi-finals', '2024-05-01', 'A', 'B', [1, 0]),
            match('Final', '2024-06-01', 'A', 'C', [1, 0]),
        ]);

        // En la final A va primero, así que su semifinal (A-B) debe ir arriba
        expect(rounds[0].ties.map((tie) => tie.key)).toEqual(['A:B', 'C:D']);
    });

    it('deja sin ganador una llave empatada sin penales ni ronda siguiente', () => {
        const [round] = buildBracket([match('Final', '2024-06-01', 'A', 'B', [1, 1])]);
        expect(round.ties[0].winnerId).toBeNull();
    });

    it('ignora fases que no son eliminatorias', () => {
        expect(buildBracket([match('League Stage - 1', '2024-09-17', 'A', 'B', [1, 0])])).toEqual([]);
    });
});
