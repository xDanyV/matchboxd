import { describe, expect, it } from 'vitest';
import { classifyStage, normalizeText, parseSearchParams, tokenize } from './search-params';

describe('normalizeText', () => {
    it('quita acentos y letras especiales', () => {
        expect(normalizeText('  Müller ')).toBe('muller');
        expect(normalizeText('Ødegaard')).toBe('odegaard');
        expect(normalizeText('Atlético')).toBe('atletico');
    });
});

describe('tokenize', () => {
    it('separa en palabras útiles sin conectores ni duplicados', () => {
        expect(tokenize('el Madrid contra el Madrid')).not.toContain('el');
        expect(tokenize('Real Madrid real')).toEqual(['real', 'madrid']);
    });
});

describe('classifyStage', () => {
    it.each([
        ['League Stage - 7', 'groups'],
        ['Group B - 1', 'groups'],
        ['Knockout Round Play-offs', 'playoffs'],
        ['Round of 16', 'round16'],
        ['Quarter-finals', 'quarters'],
        ['Semi-finals', 'semis'],
        ['Final', 'final'],
        [null, 'other'],
    ])('%s -> %s', (stage, expected) => {
        expect(classifyStage(stage)).toBe(expected);
    });
});

describe('parseSearchParams', () => {
    it('limpia la búsqueda y descarta temporadas que no existen', () => {
        const criteria = parseSearchParams({ q: '  mbappe   real ', season: '1999-2000' }, ['2024-2025']);
        expect(criteria.q).toBe('mbappe real');
        expect(criteria.season).toBeNull();
    });

    it('lee la página como número positivo', () => {
        expect(parseSearchParams({ page: '-3' }, []).page).toBe(1);
        expect(parseSearchParams({ page: '4' }, []).page).toBe(4);
    });
});
