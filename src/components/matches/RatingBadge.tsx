import { ratingTone } from '@/lib/match-stats';

const TONES = {
    elite: 'bg-sky-500 text-white',
    good: 'bg-emerald-500 text-slate-950',
    average: 'bg-amber-400 text-slate-950',
    poor: 'bg-rose-500 text-white',
} as const;

/** Nota de la API (6.8, 7.4...) con el color típico de las apps de estadísticas. */
export default function RatingBadge({ rating, className = '' }: { rating: number | null; className?: string }) {
    const tone = ratingTone(rating);
    if (tone === 'none' || rating === null) return null;

    return (
        <span
            title={`Nota del partido: ${rating.toFixed(1)}`}
            className={`inline-flex items-center justify-center min-w-[1.75rem] px-1 py-px rounded text-[10px] font-black tabular-nums leading-tight ${TONES[tone]} ${className}`}
        >
            {rating.toFixed(1)}
        </span>
    );
}
