'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, X, Sparkles, Loader2, AlertCircle, User } from 'lucide-react';
import { submitReview } from '@/app/actions/review';

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

interface ReviewModalProps {
    matchId: string;
    matchTitle: string;
    homeTeam: Team;
    awayTeam: Team;
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
}

export default function ReviewModal({
    matchId,
    matchTitle,
    homeTeam,
    awayTeam,
    isOpen,
    onClose,
    isAuthenticated,
}: ReviewModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [rating, setRating] = useState<number>(8);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mvpPlayerId, setMvpPlayerId] = useState('');
    const [hasSpoilers, setHasSpoilers] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado para alternar el equipo en el selector de MVP ("home" | "away")
    const [selectedTeamTab, setSelectedTeamTab] = useState<'home' | 'away'>('home');

    if (!isOpen) return null;

    const activeTeam = selectedTeamTab === 'home' ? homeTeam : awayTeam;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isAuthenticated) {
            router.push('/api/auth/signin');
            return;
        }

        startTransition(async () => {
            try {
                await submitReview({
                    matchId,
                    rating,
                    title,
                    content,
                    hasSpoilers,
                    mvpPlayerId: mvpPlayerId || undefined,
                });
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
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">

                {/* Cabecera */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                            Registrar Calificación
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
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                            <span>Puntuación</span>
                            <span className="text-emerald-400 font-mono text-base font-black">
                                {hoverRating !== null ? hoverRating : rating} / 10
                            </span>
                        </label>

                        <div className="flex items-center justify-between gap-1 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                const active = (hoverRating !== null ? hoverRating : rating) >= val;
                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        onMouseEnter={() => setHoverRating(val)}
                                        onMouseLeave={() => setHoverRating(null)}
                                        onClick={() => setRating(val)}
                                        className="p-1 text-slate-600 transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${active ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                                                }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

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
                            Tu Opinión del Encuentro *
                        </label>
                        <textarea
                            required
                            rows={4}
                            placeholder="Escribe tus observaciones del partido, rendimiento de los equipos, momentos clave..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Spoilers */}
                    <div className="flex items-center gap-2.5 pt-1">
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
                            <span>{isPending ? 'Guardando...' : 'Publicar Calificación'}</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}