import { describe, expect, it } from 'vitest';
import { formatSeasonRanges, normalizeSeasons, playerHref, playerIdFromParam } from './players';
import { formatRating, isValidRating } from './rating';

describe('formatSeasonRanges', () => {
    it('agrupa temporadas seguidas y separa los huecos', () => {
        expect(formatSeasonRanges([2026, 2025, 2024, 2021])).toBe('2021/22 · 2024/25 – 2026/27');
    });

    it('ignora temporadas repetidas', () => {
        expect(formatSeasonRanges([2022, 2022])).toBe('2022/23');
    });

    it('devuelve vacío sin temporadas', () => {
        expect(formatSeasonRanges([])).toBe('');
    });
});

describe('normalizeSeasons', () => {
    it('convierte los años en texto a números y los ordena del más reciente', () => {
        expect(normalizeSeasons(['2022', 2024, '2023'])).toEqual([2024, 2023, 2022]);
    });

    it('descarta valores que no son años y los repetidos', () => {
        expect(normalizeSeasons([2024, '2024', 'abc', null, 2024.5])).toEqual([2024]);
    });

    it('devuelve vacío si no llega una lista', () => {
        expect(normalizeSeasons(undefined)).toEqual([]);
    });
});

describe('ids de jugador en la URL', () => {
    it('usa solo el número de API-Football en el enlace', () => {
        expect(playerHref('api-player-328')).toBe('/players/328');
    });

    it('solo acepta números o un id completo', () => {
        expect(playerIdFromParam('328')).toBe('api-player-328');
        expect(playerIdFromParam('api-player-328')).toBe('api-player-328');
        expect(playerIdFromParam('../admin')).toBeNull();
    });
});

describe('notas', () => {
    it('acepta de 0.5 a 10 en pasos de medio punto', () => {
        expect(isValidRating(0.5)).toBe(true);
        expect(isValidRating(7.5)).toBe(true);
        expect(isValidRating(10)).toBe(true);
        expect(isValidRating(0)).toBe(false);
        expect(isValidRating(7.3)).toBe(false);
        expect(isValidRating(10.5)).toBe(false);
        expect(isValidRating('8')).toBe(false);
        expect(isValidRating(Number.NaN)).toBe(false);
    });

    it('muestra medio punto solo cuando hace falta', () => {
        expect(formatRating(8)).toBe('8');
        expect(formatRating(7.5)).toBe('7.5');
    });
});
