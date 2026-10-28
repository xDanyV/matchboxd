'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { RATING_MAX, RATING_MIN, RATING_STEP, formatRating } from '@/lib/rating';

interface HalfStarRatingProps {
    value: number;
    onChange: (value: number) => void;
}

const STARS = Array.from({ length: RATING_MAX }, (_, i) => i + 1);

/**
 * 10 estrellas con medios puntos: la mitad izquierda de cada estrella vale x.5.
 * Con teclado funciona como un slider (flechas, Inicio, Fin).
 */
export default function HalfStarRating({ value, onChange }: HalfStarRatingProps) {
    const [hover, setHover] = useState<number | null>(null);
    const shown = hover ?? value;

    const clamp = (n: number) => Math.min(RATING_MAX, Math.max(RATING_MIN, n));

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const keys: Record<string, number> = {
            ArrowRight: value + RATING_STEP,
            ArrowUp: value + RATING_STEP,
            ArrowLeft: value - RATING_STEP,
            ArrowDown: value - RATING_STEP,
            Home: RATING_MIN,
            End: RATING_MAX,
        };
        if (e.key in keys) {
            e.preventDefault();
            onChange(clamp(keys[e.key]));
        }
    };

    return (
        <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span id="rating-label">Puntuación</span>
                <span className="text-emerald-400 font-mono text-base font-black">{formatRating(shown)} / 10</span>
            </div>

            <div
                role="slider"
                tabIndex={0}
                aria-labelledby="rating-label"
                aria-valuemin={RATING_MIN}
                aria-valuemax={RATING_MAX}
                aria-valuenow={value}
                aria-valuetext={`${formatRating(value)} de 10`}
                onKeyDown={handleKeyDown}
                onMouseLeave={() => setHover(null)}
                className="flex items-center justify-between sm:gap-1 bg-slate-950/60 p-2 sm:p-2.5 rounded-2xl border border-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
                {STARS.map((star) => {
                    const fill = shown >= star ? 'full' : shown >= star - RATING_STEP ? 'half' : 'empty';
                    return (
                        <div key={star} className="relative p-0.5 sm:p-1">
                            {/* Estrella vacía de fondo y la llena recortada encima */}
                            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                            {fill !== 'empty' && (
                                <span
                                    className="absolute inset-0 p-0.5 sm:p-1 overflow-hidden pointer-events-none"
                                    style={{ width: fill === 'half' ? '50%' : '100%' }}
                                >
                                    <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 text-amber-400" />
                                </span>
                            )}
                            {/* Zonas de clic: mitad izquierda = x.5, mitad derecha = x */}
                            {[star - RATING_STEP, star].map((target, i) => (
                                <button
                                    key={target}
                                    type="button"
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    onMouseEnter={() => setHover(target)}
                                    onClick={() => onChange(target)}
                                    className={`absolute inset-y-0 w-1/2 ${i === 0 ? 'left-0' : 'right-0'}`}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
            <p className="text-[11px] text-slate-500">Toca la mitad izquierda de una estrella para medio punto.</p>
        </div>
    );
}
