/** Máximo de etiquetas que puede elegir un usuario en una reseña. */
export const MAX_REVIEW_TAGS = 3;

/** Votos mínimos que necesita una etiqueta para ser la "principal" del partido. */
export const MIN_VOTES_FOR_MAIN_TAG = 1;

export type ReviewTagTone = 'amber' | 'emerald' | 'violet' | 'rose' | 'sky' | 'slate';

export interface ReviewTagDefinition {
    slug: string;
    label: string;
    tone: ReviewTagTone;
    /** Etiquetas opuestas: no pueden elegirse en la misma reseña. */
    conflictsWith: readonly string[];
}

export const REVIEW_TAGS = [
    { slug: 'epic', label: 'Épico', tone: 'amber', conflictsWith: ['boring'] },
    { slug: 'comeback', label: 'Remontada', tone: 'emerald', conflictsWith: ['boring'] },
    { slug: 'dramatic', label: 'Dramático', tone: 'violet', conflictsWith: ['boring'] },
    { slug: 'controversial', label: 'Polémico', tone: 'rose', conflictsWith: [] },
    { slug: 'goalfest', label: 'Festival de goles', tone: 'sky', conflictsWith: ['boring'] },
    { slug: 'tactical', label: 'Táctico', tone: 'slate', conflictsWith: [] },
    {
        slug: 'boring',
        label: 'Aburrido',
        tone: 'slate',
        conflictsWith: ['epic', 'comeback', 'dramatic', 'goalfest'],
    },
] as const satisfies readonly ReviewTagDefinition[];

export type ReviewTagSlug = (typeof REVIEW_TAGS)[number]['slug'];

const DEFINITIONS: readonly ReviewTagDefinition[] = REVIEW_TAGS;

export function isReviewTagSlug(value: unknown): value is ReviewTagSlug {
    return typeof value === 'string' && DEFINITIONS.some((tag) => tag.slug === value);
}

export function getReviewTag(slug: string): ReviewTagDefinition | undefined {
    return DEFINITIONS.find((tag) => tag.slug === slug);
}

function tagsConflict(a: string, b: string) {
    return (
        getReviewTag(a)?.conflictsWith.includes(b) === true ||
        getReviewTag(b)?.conflictsWith.includes(a) === true
    );
}

/**
 * Valida lo que llega del cliente: solo etiquetas del catálogo, sin duplicados,
 * sin opuestas entre sí y con un máximo de MAX_REVIEW_TAGS.
 */
export function sanitizeReviewTags(input: unknown): ReviewTagSlug[] {
    if (!Array.isArray(input)) return [];

    const result: ReviewTagSlug[] = [];

    for (const item of input) {
        if (!isReviewTagSlug(item) || result.includes(item)) continue;
        if (result.some((existing) => tagsConflict(existing, item))) continue;

        result.push(item);
        if (result.length >= MAX_REVIEW_TAGS) break;
    }

    return result;
}

/**
 * Lógica del selector: quita la etiqueta si ya estaba; si no, la agrega quitando
 * las opuestas. Si no hay espacio devuelve el mismo arreglo recibido.
 */
export function toggleReviewTag(current: ReviewTagSlug[], slug: ReviewTagSlug): ReviewTagSlug[] {
    if (current.includes(slug)) return current.filter((item) => item !== slug);

    const compatible = current.filter((item) => !tagsConflict(item, slug));
    if (compatible.length >= MAX_REVIEW_TAGS) return current;

    return [...compatible, slug];
}

export interface TagCount {
    slug: ReviewTagSlug;
    count: number;
}

export interface ReviewTagSummary {
    /** Etiquetas con votos, de la más a la menos votada. */
    counts: TagCount[];
    /** Etiquetas empatadas en el primer lugar (con al menos MIN_VOTES_FOR_MAIN_TAG votos). */
    leading: ReviewTagSlug[];
    /** Etiqueta principal única, o null si hay empate en el primer lugar. */
    main: ReviewTagSlug | null;
    /** Reseñas que tienen al menos una etiqueta. */
    taggedReviews: number;
}

/** Cuenta una vez cada etiqueta por reseña y calcula las etiquetas más votadas. */
export function summarizeReviewTags(
    reviews: readonly { tags?: readonly string[] | null }[]
): ReviewTagSummary {
    const totals = new Map<ReviewTagSlug, number>();
    let taggedReviews = 0;

    for (const review of reviews) {
        const unique = new Set((review.tags ?? []).filter(isReviewTagSlug));
        if (unique.size === 0) continue;

        taggedReviews += 1;
        unique.forEach((slug) => totals.set(slug, (totals.get(slug) ?? 0) + 1));
    }

    const order = (slug: string) => DEFINITIONS.findIndex((tag) => tag.slug === slug);

    const counts = Array.from(totals, ([slug, count]) => ({ slug, count })).sort(
        (a, b) => b.count - a.count || order(a.slug) - order(b.slug)
    );

    // Todas las etiquetas empatadas en el primer lugar cuentan como "las más votadas"
    const top = counts[0];
    const leading =
        top && top.count >= MIN_VOTES_FOR_MAIN_TAG
            ? counts.filter((item) => item.count === top.count).map((item) => item.slug)
            : [];

    return { counts, leading, main: leading.length === 1 ? leading[0] : null, taggedReviews };
}