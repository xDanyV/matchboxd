import { describe, expect, it } from 'vitest';
import { checkContent, normalizeForFilter } from './content-filter';

describe('normalizeForFilter', () => {
    it('quita mayúsculas, acentos, leetspeak y letras repetidas', () => {
        expect(normalizeForFilter('P3ND3J0')).toBe('pendejo');
        expect(normalizeForFilter('Cabróóón')).toBe('cabron');
        expect(normalizeForFilter('puuuuta')).toBe('puta');
    });
});

describe('checkContent', () => {
    it('deja pasar texto limpio', () => {
        expect(checkContent('Qué partidazo, el mejor de la temporada')).toEqual({ level: 'clean', matches: [] });
    });

    it('no marca palabras que solo contienen una grosería', () => {
        expect(checkContent('Lo vi en la computadora del trabajo').level).toBe('clean');
    });

    it('marca groserías comunes para moderación sin bloquearlas', () => {
        const result = checkContent('Qué golazo, cabrón');
        expect(result.level).toBe('flag');
        expect(result.matches).toContain('cabron');
    });

    it('detecta groserías separadas por puntos o espacios', () => {
        expect(checkContent('p.u.t.a madre').level).toBe('flag');
        expect(checkContent('p u t a')).toMatchObject({ level: 'flag' });
    });

    it('bloquea insultos discriminatorios, también en plural', () => {
        expect(checkContent('sudacas').level).toBe('block');
    });

    it('bloquea amenazas escritas como frase', () => {
        expect(checkContent('Te voy a matar si pierdes').level).toBe('block');
    });

    it('revisa varios campos a la vez y prioriza el bloqueo', () => {
        expect(checkContent('título limpio', null, 'mierda', 'muérete').level).toBe('block');
    });
});
