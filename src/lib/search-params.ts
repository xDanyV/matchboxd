export type SortOption = 'recent' | 'rating';

export type StageCategoryKey =
    | 'groups'
    | 'playoffs'
    | 'round16'
    | 'quarters'
    | 'semis'
    | 'final'
    | 'other';

interface StageCategory {
    key: StageCategoryKey;
    label: string;
    /** Palabras (normalizadas) con las que un usuario podría buscar esta fase */
    keywords: string[];
}

export const STAGE_CATEGORIES: StageCategory[] = [
    {
        key: 'groups',
        label: 'Fase de grupos / liga',
        keywords: ['fase de grupos', 'grupos', 'grupo', 'group', 'fase de liga', 'league stage', 'league phase'],
    },
    {
        key: 'playoffs',
        label: 'Previa y play-offs',
        keywords: ['playoffs', 'play-offs', 'play off', 'repechaje', 'previa', 'preliminary', 'qualifying'],
    },
    { key: 'round16', label: 'Octavos de final', keywords: ['octavos', 'round of 16', '16'] },
    { key: 'quarters', label: 'Cuartos de final', keywords: ['cuartos', 'quarter', 'quarter-finals'] },
    { key: 'semis', label: 'Semifinales', keywords: ['semifinal', 'semifinales', 'semi', 'semi-finals'] },
    { key: 'final', label: 'Final', keywords: ['final'] },
    { key: 'other', label: 'Otras fases', keywords: [] },
];

export interface SearchCriteria {
    q: string;
    season: string | null;
    stage: StageCategoryKey | null;
    min: number | null;
    max: number | null;
    sort: SortOption;
    page: number;
}

export type RawSearchParams = { [key: string]: string | string[] | undefined };

export interface SuggestionsPayload {
    teams: {
        id: string;
        name: string;
        slug: string;
        crestUrl: string | null;
        country: string | null;
    }[];
    matches: {
        id: string;
        season: string;
        stage: string | null;
        homeScore: number;
        awayScore: number;
        homeTeam: { name: string; crestUrl: string | null };
        awayTeam: { name: string; crestUrl: string | null };
    }[];
}

export const MAX_QUERY_LENGTH = 80;
export const MAX_TOKENS = 5;

const CHAR_MAP: Record<string, string> = {
    ø: 'o',
    æ: 'ae',
    œ: 'oe',
    ß: 'ss',
    đ: 'd',
    ł: 'l',
    ı: 'i',
};

const STOPWORDS = new Set(['vs', 'de', 'del', 'la', 'el', 'los', 'las', 'fc', 'cf', 'the']);

/** Minúsculas y sin acentos, para comparar "Múnich" con "München". */
export function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[øæœßđłı]/g, (char) => CHAR_MAP[char] ?? char)
        .trim();
}

/** Divide la búsqueda en palabras útiles (sin acentos, sin conectores). */
export function tokenize(query: string): string[] {
    const all = normalizeText(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);

    const meaningful = all.filter((token) => token.length >= 2 && !STOPWORDS.has(token));
    const chosen = meaningful.length > 0 ? meaningful : all;

    return Array.from(new Set(chosen)).slice(0, MAX_TOKENS);
}

/** Agrupa el texto de la fase (viene de la API) en una categoría legible. */
export function classifyStage(stage: string | null | undefined): StageCategoryKey {
    if (!stage) return 'other';
    const s = normalizeText(stage);

    if (/quarter|cuartos/.test(s)) return 'quarters';
    if (/semi/.test(s)) return 'semis';
    if (/round of 16|octavos/.test(s)) return 'round16';
    if (/play-?offs?|preliminary|qualifying|previa/.test(s)) return 'playoffs';
    if (/group|league stage|league phase|fase/.test(s)) return 'groups';
    if (/\bfinal\b/.test(s)) return 'final';

    return 'other';
}

function readParam(raw: RawSearchParams, key: string): string | undefined {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
}

function readRating(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) return null;
    return Math.min(10, Math.max(1, Math.round(parsed)));
}

/** Valida y normaliza los parámetros de la URL (nunca confía en ellos). */
export function parseSearchParams(raw: RawSearchParams, validSeasons: string[]): SearchCriteria {
    const q = (readParam(raw, 'q') ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);

    const seasonParam = readParam(raw, 'season');
    const season = seasonParam && validSeasons.includes(seasonParam) ? seasonParam : null;

    const stageParam = readParam(raw, 'stage');
    const stage = STAGE_CATEGORIES.find((c) => c.key === stageParam)?.key ?? null;

    let min = readRating(readParam(raw, 'min'));
    let max = readRating(readParam(raw, 'max'));
    if (min !== null && max !== null && min > max) {
        [min, max] = [max, min];
    }

    const sort: SortOption = readParam(raw, 'sort') === 'rating' ? 'rating' : 'recent';

    const parsedPage = parseInt(readParam(raw, 'page') ?? '1', 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : Math.min(parsedPage, 1000);

    return { q, season, stage, min, max, sort, page };
}

/** Construye la URL de /search omitiendo los valores por defecto. */
export function buildSearchHref(
    criteria: Partial<SearchCriteria>,
    overrides: Partial<SearchCriteria> = {}
): string {
    const merged = { ...criteria, ...overrides };
    const params = new URLSearchParams();

    if (merged.q) params.set('q', merged.q);
    if (merged.season) params.set('season', merged.season);
    if (merged.stage) params.set('stage', merged.stage);
    if (merged.min !== null && merged.min !== undefined) params.set('min', String(merged.min));
    if (merged.max !== null && merged.max !== undefined) params.set('max', String(merged.max));
    if (merged.sort && merged.sort !== 'recent') params.set('sort', merged.sort);
    if (merged.page && merged.page > 1) params.set('page', String(merged.page));

    const qs = params.toString();
    return qs ? `/search?${qs}` : '/search';
}