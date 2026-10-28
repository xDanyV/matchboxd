'use client';

import { useState, useTransition } from 'react';
import { loginHref } from '@/lib/login';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, Sparkles, Loader2, AlertCircle, User, BookOpen } from 'lucide-react';
import type { WatchMethod } from '@prisma/client';
import { submitReview } from '@/app/actions/review';
import ReviewTagPicker from '@/components/reviews/ReviewTagPicker';
import HalfStarRating from '@/components/matches/HalfStarRating';
import { sanitizeReviewTags, type ReviewTagSlug } from '@/lib/review-tags';
import { WATCH_METHODS, toDateInputValue } from '@/lib/watch-methods';

interface Player {
    id: string;
    name: string;
    position: string | null;
    photoUrl?: string | null;
}

interface Team {
    id: string;
    name: string;
    shortName?: string | null;
    crestUrl?: string | null;
    players: Player[];
}

export interface ExistingReview {
    rating: number;
    title: string | null;
    content: string | null;
    hasSpoilers: boolean;
    tags: string[];
}

interface ReviewModalProps {
    matchId: string;
    matchTitle: string;
    /** Fecha del partido en ISO: límite inferior del diario */
    matchDate: string;
    homeTeam: Team;
    awayTeam: Team;
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
    existingReview?: ExistingReview | null;
    existingMvpPlayerId?: string | null;
    /** Veces que el usuario ya registró este partido en su diario */
    timesWatched?: number;
}

export default function ReviewModal({
    matchId,
    matchTitle,
    matchDate,
    homeTeam,
    awayTeam,
    isOpen,
    onClose,
    isAuthenticated,
    existingReview = null,
    existingMvpPlayerId = null,
    timesWatched = 0,
}: ReviewModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [rating, setRating] = useState<number>(existingReview?.rating ?? 8);
    const [title, setTitle] = useState(existingReview?.title ?? '');
    const [content, setContent] = useState(existingReview?.content ?? '');
    const [mvpPlayerId, setMvpPlayerId] = useState(existingMvpPlayerId ?? '');
    const [hasSpoilers, setHasSpoilers] = useState(existingReview?.hasSpoilers ?? false);
    const [tags, setTags] = useState<ReviewTagSlug[]>(sanitizeReviewTags(existingReview?.tags ?? []));
    const [error, setError] = useState<string | null>(null);

    // Diario: la primera vez se registra por defecto; después, solo si es una re-vista
    const [addToDiary, setAddToDiary] = useState(timesWatched === 0);
    const [watchedOn, setWatchedOn] = useState(() => toDateInputValue(new Date()));
    const [method, setMethod] = useState<WatchMethod | null>(null);
    const [isRewatch, setIsRewatch] = useState(timesWatched > 0);

    // Estado para alternar el equipo en el selector de MVP ("home" | "away")
    const [selectedTeamTab, setSelectedTeamTab] = useState<'home' | 'away'>('home');

    if (!isOpen) return null;

    const activeTeam = selectedTeamTab === 'home' ? homeTeam : awayTeam;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isAuthenticated) {
            router.push(loginHref(window.location.pathname));
            return;
        }

        startTransition(async () => {
            try {
                const result = await submitReview({
                    matchId,
                    rating,
                    title,
                    content,
                    hasSpoilers,
                    tags,
                    mvpPlayerId: mvpPlayerId || undefined,
                    log: addToDiary ? { watchedOn, method, isRewatch } : undefined,
                });
                if (!result.success) {
                    setError(result.error);
                    return;
                }
                onClose();
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Ocurrió un error inesperado al guardar la calificación.');
                }
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">

                {/* Cabecera */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                            {existingReview ? 'Editar calificación' : 'Registrar partido'}
                        </span>
                        <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                            {matchTitle}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar modal"
                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Selector de Puntuación */}
                    <HalfStarRating value={rating} onChange={setRating} />

                    {/* Diario */}
                    <fieldset className="space-y-3 bg-slate-950/40 border border-slate-800 rounded-2xl p-3.5">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={addToDiary}
                                onChange={(e) => setAddToDiary(e.target.checked)}
                                aria-label={timesWatched > 0 ? 'Añadir otro visionado al diario' : 'Añadir a mi diario'}
                                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                {timesWatched > 0 ? 'Añadir otro visionado al diario' : 'Añadir a mi diario'}
                            </span>
                            {timesWatched > 0 && (
                                <span className="ml-auto text-[11px] text-slate-500">
                                    Visto {timesWatched} {timesWatched === 1 ? 'vez' : 'veces'}
                                </span>
                            )}
                        </label>

                        {addToDiary && (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label htmlFor="watchedOn" className="text-xs text-slate-400">
                                        Lo vi el
                                    </label>
                                    <input
                                        id="watchedOn"
                                        type="date"
                                        required
                                        value={watchedOn}
                                        min={matchDate.slice(0, 10)}
                                        max={toDateInputValue(new Date())}
                                        onChange={(e) => setWatchedOn(e.target.value)}
                                        className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 scheme-dark focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isRewatch}
                                            onChange={(e) => setIsRewatch(e.target.checked)}
                                            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                                        />
                                        Ya lo había visto
                                    </label>
                                </div>

                                <div role="group" aria-label="Cómo lo viste" className="flex flex-wrap gap-1.5">
                                    {WATCH_METHODS.map((option) => {
                                        const isSelected = method === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                aria-pressed={isSelected}
                                                onClick={() => setMethod(isSelected ? null : option.value)}
                                                className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${isSelected
                                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                                                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </fieldset>

                    {/* Etiquetas del partido */}
                    <ReviewTagPicker value={tags} onChange={setTags} disabled={isPending} />

                    {/* Selector de MVP interactivo por Equipos */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Votar MVP del Partido (Opcional)</span>
                        </label>

                        {/* Switch de Equipos */}
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button
                                type="button"
                                onClick={() => setSelectedTeamTab('home')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${selectedTeamTab === 'home'
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {homeTeam.crestUrl && (
                                    <Image
                                        src={homeTeam.crestUrl}
                                        alt={homeTeam.name}
                                        width={18}
                                        height={18}
                                        className="object-contain"
                                    />
                                )}
                                <span className="truncate">{homeTeam.shortName || homeTeam.name}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedTeamTab('away')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${selectedTeamTab === 'away'
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {awayTeam.crestUrl && (
                                    <Image
                                        src={awayTeam.crestUrl}
                                        alt={awayTeam.name}
                                        width={18}
                                        height={18}
                                        className="object-contain"
                                    />
                                )}
                                <span className="truncate">{awayTeam.shortName || awayTeam.name}</span>
                            </button>
                        </div>

                        {/* Lista de Jugadores con Foto */}
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                            {activeTeam.players.length > 0 ? (
                                activeTeam.players.map((player) => {
                                    const isSelected = mvpPlayerId === player.id;
                                    return (
                                        <div
                                            key={player.id}
                                            onClick={() => setMvpPlayerId(isSelected ? '' : player.id)}
                                            className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${isSelected
                                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                                                : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                                                }`}
                                        >
                                            {player.photoUrl ? (
                                                <Image
                                                    src={player.photoUrl}
                                                    alt={player.name}
                                                    width={32}
                                                    height={32}
                                                    className="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{player.name}</p>
                                                {player.position && (
                                                    <p className="text-[10px] text-slate-500">{player.position}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-slate-500 italic p-2 text-center">
                                    No hay jugadores registrados para este equipo.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Título */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Título del Análisis (Opcional)
                        </label>
                        <input
                            type="text"
                            placeholder="Ej. Una exhibición táctica memorable..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    {/* Reseña */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Tu Opinión del Encuentro (Opcional)
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Escribe tus observaciones del partido, rendimiento de los equipos, momentos clave..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        />
                        <p className="text-[11px] text-slate-500">
                            Si lo dejas vacío, solo se guarda tu calificación.
                        </p>
                    </div>

                    {/* Spoilers (solo aplica si hay texto) */}
                    <div className={`flex items-center gap-2.5 pt-1 ${content.trim() ? '' : 'hidden'}`}>
                        <input
                            type="checkbox"
                            id="spoilers"
                            checked={hasSpoilers}
                            onChange={(e) => setHasSpoilers(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="spoilers" className="text-xs text-slate-400 cursor-pointer select-none">
                            Esta reseña contiene spoilers del resultado final
                        </label>
                    </div>

                    {/* Botones */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>
                                {isPending ? 'Guardando...' : content.trim() ? 'Publicar Reseña' : 'Guardar Calificación'}
                            </span>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}