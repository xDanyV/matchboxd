import { Brain, Drama, Flame, Goal, Moon, Siren, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    getReviewTag,
    isReviewTagSlug,
    type ReviewTagSlug,
    type ReviewTagTone,
} from '@/lib/review-tags';

export const TAG_ICONS: Record<ReviewTagSlug, LucideIcon> = {
    epic: Flame,
    comeback: TrendingUp,
    dramatic: Drama,
    controversial: Siren,
    goalfest: Goal,
    tactical: Brain,
    boring: Moon,
};

export const TAG_TONES: Record<ReviewTagTone, string> = {
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
    sky: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
};

interface ReviewTagChipProps {
    slug: string;
    count?: number;
    size?: 'sm' | 'md';
    highlight?: boolean;
    title?: string;
}

export function ReviewTagChip({
    slug,
    count,
    size = 'sm',
    highlight = false,
    title,
}: ReviewTagChipProps) {
    if (!isReviewTagSlug(slug)) return null;

    const tag = getReviewTag(slug);
    if (!tag) return null;

    const Icon = TAG_ICONS[slug];
    const sizeClasses = size === 'md' ? 'gap-1.5 px-3 py-1 text-xs' : 'gap-1 px-2 py-0.5 text-[10px]';
    const iconClasses = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

    return (
        <span
            title={title}
            className={`inline-flex shrink-0 items-center rounded-full border font-bold uppercase tracking-wider ${TAG_TONES[tag.tone]} ${sizeClasses} ${highlight ? 'ring-1 ring-white/20' : ''
                }`}
        >
            <Icon className={iconClasses} aria-hidden="true" />
            <span>{tag.label}</span>
            {count !== undefined && <span className="font-mono opacity-80">×{count}</span>}
        </span>
    );
}

export function ReviewTagList({ tags }: { tags: readonly string[] | null | undefined }) {
    const valid = (tags ?? []).filter(isReviewTagSlug);
    if (valid.length === 0) return null;

    return (
        <ul aria-label="Etiquetas de la reseña" className="flex flex-wrap items-center gap-1.5">
            {valid.map((slug) => (
                <li key={slug}>
                    <ReviewTagChip slug={slug} />
                </li>
            ))}
        </ul>
    );
}