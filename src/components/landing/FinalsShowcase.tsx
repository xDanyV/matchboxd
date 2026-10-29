'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import { RATING_MAX, RATING_MIN, RATING_STEP, formatRating } from '@/lib/rating';

export interface LandingFinal {
    id: string;
    year: string;
    city: string;
    dateLabel: string;
    stadium: string;
    home: { name: string; crestUrl: string | null };
    away: { name: string; crestUrl: string | null };
    homeScore: number;
    awayScore: number;
    story: string;
    /** Mejor nota de la API en ese partido; null si aún no se descargó el detalle */
    best: { name: string; rating: number } | null;
    photo: { src: string; alt: string; credit: string; license: string; href: string };
}

interface FinalsShowcaseProps {
    finals: LandingFinal[];
    isLoggedIn: boolean;
}

const STARS = Array.from({ length: RATING_MAX }, (_, i) => i + 1);

export default function FinalsShowcase({ finals, isLoggedIn }: FinalsShowcaseProps) {
    const [active, setActive] = useState(0);
    // Una nota por final, para que cambiar de pestaña no borre lo que ya calificaste
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [hover, setHover] = useState<number | null>(null);

    const final = finals[active];
    if (!final) return null;

    const myRating = ratings[final.id] ?? null;
    const shown = hover ?? myRating ?? 0;
    const setRating = (value: number) =>
        setRatings((prev) => ({ ...prev, [final.id]: Math.min(RATING_MAX, Math.max(RATING_MIN, value)) }));

    const diaryHref = isLoggedIn ? `/matches/${final.id}` : `/login?callbackUrl=${encodeURIComponent(`/matches/${final.id}`)}`;

    return (
        <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16 items-start">
            {/* Foto cuadrada con muesca de boleto */}
            <figure className="space-y-3">
                <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-slate-800">
                    {finals.map((f, i) => (
                        <div
                            key={f.id}
                            className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${i === active ? 'opacity-100' : 'opacity-0'}`}
                            aria-hidden={i !== active}
                        >
                            <Image
                                src={f.photo.src}
                                alt={f.photo.alt}
                                fill
                                sizes="(max-width: 767px) 100vw, 50vw"
                                className={`object-cover ${i === active ? 'lp-drift' : ''}`}
                                priority={i === 0}
                            />
                        </div>
                    ))}
                    <span aria-hidden className="absolute left-0 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#090d16]" />
                    <span aria-hidden className="absolute right-0 top-1/2 h-10 w-10 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#090d16]" />
                    <span className="absolute bottom-4 left-4 rounded-full bg-[var(--paper)] px-3 py-1 text-sm font-bold text-[var(--ink)]">
                        {final.stadium}
                    </span>
                </div>
                <figcaption className="text-xs text-slate-400">
                    Foto: {final.photo.alt}, de {final.photo.credit} ·{' '}
                    <a href={final.photo.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                        {final.photo.license}
                    </a>
                    , Wikimedia Commons
                </figcaption>
            </figure>

            <div className="space-y-6">
                {/* Pestañas de las tres finales */}
                <div role="tablist" aria-label="Finales del archivo" className="flex flex-wrap gap-2">
                    {finals.map((f, i) => (
                        <button
                            key={f.id}
                            type="button"
                            role="tab"
                            aria-selected={i === active}
                            onClick={() => {
                                setActive(i);
                                setHover(null);
                            }}
                            className={`min-h-11 rounded-full px-4 py-2 text-sm font-bold transition-[background-color,color,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${i === active
                                ? 'bg-[var(--paper)] text-[var(--ink)]'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            {f.year} · {f.city}
                        </button>
                    ))}
                </div>

                <div key={final.id} className="space-y-4 lp-load">
                    <h3 className="flex flex-wrap items-center gap-x-3 gap-y-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                        <TeamCrest name={final.home.name} crestUrl={final.home.crestUrl} size={40} />
                        <span className="tabular-nums">
                            {final.homeScore}–{final.awayScore}
                        </span>
                        <TeamCrest name={final.away.name} crestUrl={final.away.crestUrl} size={40} />
                    </h3>
                    <p className="text-lg font-bold text-white" style={{ ['--i' as string]: 1 }}>
                        {final.home.name} contra {final.away.name}, {final.dateLabel}
                    </p>
                    <p className="text-base sm:text-lg leading-relaxed text-slate-300" style={{ ['--i' as string]: 2 }}>
                        {final.story}
                    </p>
                </div>

                {/* Lo vivo: califica la final y compárala con la mejor nota de datos */}
                <div className="rounded-[1.5rem] bg-[var(--paper)] p-5 sm:p-6 text-[var(--ink)] space-y-4">
                    <p className="text-base font-bold">¿Qué nota le pones?</p>
                    <div
                        role="slider"
                        tabIndex={0}
                        aria-label={`Tu nota para ${final.home.name} contra ${final.away.name}`}
                        aria-valuemin={RATING_MIN}
                        aria-valuemax={RATING_MAX}
                        aria-valuenow={myRating ?? 0}
                        aria-valuetext={myRating ? `${formatRating(myRating)} de 10` : 'Sin nota'}
                        onKeyDown={(e) => {
                            const base = myRating ?? 0;
                            const keys: Record<string, number> = {
                                ArrowRight: base + RATING_STEP,
                                ArrowUp: base + RATING_STEP,
                                ArrowLeft: base - RATING_STEP,
                                ArrowDown: base - RATING_STEP,
                                Home: RATING_MIN,
                                End: RATING_MAX,
                            };
                            if (e.key in keys) {
                                e.preventDefault();
                                setRating(keys[e.key]);
                            }
                        }}
                        onMouseLeave={() => setHover(null)}
                        className="flex items-center justify-between rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ink)]"
                    >
                        {STARS.map((star) => {
                            const fill = shown >= star ? 'full' : shown >= star - RATING_STEP ? 'half' : 'empty';
                            return (
                                <span key={star} className="relative p-0.5 sm:p-1 md:p-0.5 lg:p-1 transition-transform hover:scale-110">
                                    <Star className="h-6 w-6 sm:h-7 sm:w-7 md:h-6 md:w-6 lg:h-7 lg:w-7 text-[var(--ink)]/25" />
                                    {fill !== 'empty' && (
                                        <span
                                            className="pointer-events-none absolute inset-0 overflow-hidden p-0.5 sm:p-1 md:p-0.5 lg:p-1"
                                            style={{ width: fill === 'half' ? '50%' : '100%' }}
                                        >
                                            <Star className="h-6 w-6 sm:h-7 sm:w-7 md:h-6 md:w-6 lg:h-7 lg:w-7 fill-amber-500 text-amber-500" />
                                        </span>
                                    )}
                                    {[star - RATING_STEP, star].map((target, i) => (
                                        <button
                                            key={target}
                                            type="button"
                                            tabIndex={-1}
                                            aria-hidden="true"
                                            onMouseEnter={() => setHover(target)}
                                            onClick={() => setRating(target)}
                                            className={`absolute inset-y-0 w-1/2 ${i === 0 ? 'left-0' : 'right-0'}`}
                                        />
                                    ))}
                                </span>
                            );
                        })}
                    </div>

                    <dl className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-[var(--paper-2)] p-4">
                            <dt className="text-sm text-[var(--ink-soft)]">Tu nota</dt>
                            <dd className="text-3xl font-black tabular-nums" aria-live="polite">
                                {hover ?? myRating ? formatRating((hover ?? myRating) as number) : '–'}
                            </dd>
                        </div>
                        <div className="rounded-2xl bg-[var(--ink)] p-4 text-[var(--paper)]">
                            <dt className="text-sm opacity-80">{final.best ? `Mejor nota: ${final.best.name}` : 'Nota de datos'}</dt>
                            <dd className="text-3xl font-black tabular-nums">{final.best ? formatRating(final.best.rating) : 'Pronto'}</dd>
                        </div>
                    </dl>

                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                        <Link
                            href={diaryHref}
                            className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-bold text-white transition-[background-color,transform] hover:bg-emerald-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
                        >
                            Guardar en mi diario
                        </Link>
                        <Link
                            href={`/matches/${final.id}`}
                            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--paper-2)] px-5 text-sm font-bold text-[var(--ink)] transition-[background-color,transform] hover:bg-[#d6cfbd] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
                        >
                            Ver el partido
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
