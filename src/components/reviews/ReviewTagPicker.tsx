'use client';

import { TAG_ICONS, TAG_TONES } from '@/components/reviews/ReviewTagChip';
import {
    MAX_REVIEW_TAGS,
    REVIEW_TAGS,
    toggleReviewTag,
    type ReviewTagSlug,
} from '@/lib/review-tags';

interface ReviewTagPickerProps {
    value: ReviewTagSlug[];
    onChange: (next: ReviewTagSlug[]) => void;
    disabled?: boolean;
}

export default function ReviewTagPicker({ value, onChange, disabled = false }: ReviewTagPickerProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Etiquetas (Opcional)
                </span>
                <span className="font-mono text-xs text-slate-500">
                    {value.length}/{MAX_REVIEW_TAGS}
                </span>
            </div>

            <div role="group" aria-label="Etiquetas del partido" className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map((tag) => {
                    const active = value.includes(tag.slug);
                    const next = toggleReviewTag(value, tag.slug);
                    const blocked = !active && next === value;
                    const Icon = TAG_ICONS[tag.slug];

                    return (
                        <button
                            key={tag.slug}
                            type="button"
                            aria-pressed={active}
                            disabled={disabled || blocked}
                            onClick={() => onChange(next)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${active
                                    ? `${TAG_TONES[tag.tone]} shadow-lg shadow-black/20`
                                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white'
                                }`}
                        >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {tag.label}
                        </button>
                    );
                })}
            </div>

            <p className="text-[11px] text-slate-500">
                Elige hasta {MAX_REVIEW_TAGS}. Las etiquetas opuestas se excluyen entre sí.
            </p>
        </div>
    );
}