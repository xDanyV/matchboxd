/**
 * Filtro automático de lenguaje para reseñas, comentarios y perfiles.
 *
 * - BLOCK: insultos discriminatorios y amenazas. El contenido no se publica.
 * - FLAG: groserías comunes. Se publica, pero entra solo a la cola de moderación,
 *   porque en fútbol muchas son desahogo ("qué golazo, cabrón") y no ataques.
 *
 * Se compara por palabras completas (no por subcadenas) para no marcar
 * palabras inocentes que contienen otra ("computadora" contiene "puta").
 */

export type FilterLevel = 'clean' | 'flag' | 'block';

export interface FilterResult {
    level: FilterLevel;
    /** Términos detectados, ya normalizados */
    matches: string[];
}

// Palabras sueltas: también se detectan en plural (+s / +es)
const BLOCK_WORDS = [
    // Insultos discriminatorios (orientación, raza, origen, discapacidad)
    'maricon', 'joto', 'sudaca', 'panchito', 'nigger', 'nigga', 'faggot', 'retard',
];

// Frases: se buscan como secuencia de palabras completas
const BLOCK_PHRASES = [
    'te voy a matar', 'te vamos a matar', 'te voy a violar', 'ojala te mueras', 'ojala se muera',
    'muerete', 'matate', 'suicidate', 'kill yourself', 'kys', 'negro de mierda', 'mono de mierda',
];

const FLAG_WORDS = [
    'puta', 'puto', 'putas', 'hijueputa', 'hdp', 'mierda', 'pendejo', 'pendeja', 'cabron', 'cabrona',
    'joder', 'jodete', 'verga', 'chingar', 'chinga', 'chingada', 'chingado', 'culero', 'pinche',
    'gilipollas', 'malparido', 'marica', 'subnormal', 'retrasado', 'fuck', 'fucking', 'shit', 'bitch', 'asshole',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

/**
 * Normaliza para que no se pueda esquivar el filtro con mayúsculas, acentos,
 * números en lugar de letras (p3nd3j0), letras repetidas (puuuta) o separadores (p.u.t.a).
 */
export function normalizeForFilter(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[013457@$]/g, (char) => LEET[char] ?? char)
        .replace(/[^a-z\s]+/g, ' ')
        .replace(/([a-z])\1+/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokensOf(text: string): string[] {
    const tokens = normalizeForFilter(text).split(' ').filter(Boolean);

    // "p u t a" o "p.u.t.a" quedan como letras sueltas: se unen en una palabra más
    const joined: string[] = [];
    let run = '';
    for (const token of tokens) {
        if (token.length === 1) {
            run += token;
        } else {
            if (run.length >= 3) joined.push(run);
            run = '';
        }
    }
    if (run.length >= 3) joined.push(run);

    return [...tokens, ...joined];
}

const normalizedList = (list: string[]) => [...new Set(list.map(normalizeForFilter))];
const BLOCK_WORDS_N = normalizedList(BLOCK_WORDS);
const BLOCK_PHRASES_N = normalizedList(BLOCK_PHRASES);
const FLAG_WORDS_N = normalizedList(FLAG_WORDS);

function matchesWord(token: string, word: string) {
    return token === word || token === `${word}s` || token === `${word}es`;
}

export function checkContent(...texts: (string | null | undefined)[]): FilterResult {
    const text = texts.filter(Boolean).join(' \n ');
    if (!text.trim()) return { level: 'clean', matches: [] };

    const tokens = tokensOf(text);
    const sentence = ` ${normalizeForFilter(text)} `;

    const blocked = [
        ...BLOCK_WORDS_N.filter((word) => tokens.some((token) => matchesWord(token, word))),
        ...BLOCK_PHRASES_N.filter((phrase) => sentence.includes(` ${phrase} `)),
    ];
    if (blocked.length > 0) return { level: 'block', matches: blocked };

    const flagged = FLAG_WORDS_N.filter((word) => tokens.some((token) => matchesWord(token, word)));
    if (flagged.length > 0) return { level: 'flag', matches: flagged };

    return { level: 'clean', matches: [] };
}

export const BLOCKED_CONTENT_MESSAGE =
    'Tu texto contiene lenguaje discriminatorio o amenazas, que no están permitidos en Matchbox. Edítalo para poder publicarlo.';
