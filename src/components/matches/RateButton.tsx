'use client';

import { useEffect, useState } from 'react';
import ReviewModal, { type ExistingReview } from './ReviewModal';

interface Player {
    id: string;
    name: string;
    position: string | null;
    photoUrl?: string | null;
}

export interface RateTeam {
    id: string;
    name: string;
    shortName?: string | null;
    crestUrl?: string | null;
    players: Player[];
}

interface RateButtonProps {
    matchId: string;
    matchTitle: string;
    matchDate: string;
    homeTeam: RateTeam;
    awayTeam: RateTeam;
    isAuthenticated: boolean;
    existingReview?: ExistingReview | null;
    existingMvpPlayerId?: string | null;
    timesWatched?: number;
    /** Nota que llega desde la portada (?rate=): abre el formulario ya con ella */
    suggestedRating?: number | null;
}

export default function RateButton({
    matchId,
    matchTitle,
    matchDate,
    homeTeam,
    awayTeam,
    isAuthenticated,
    existingReview = null,
    existingMvpPlayerId = null,
    timesWatched = 0,
    suggestedRating = null,
}: RateButtonProps) {
    const [isOpen, setIsOpen] = useState(suggestedRating !== null);

    // Quita ?rate= de la URL para que recargar o compartir el enlace no vuelva a abrir el formulario
    useEffect(() => {
        if (suggestedRating === null) return;
        const url = new URL(window.location.href);
        url.searchParams.delete('rate');
        window.history.replaceState(window.history.state, '', url);
    }, [suggestedRating]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
            >
                {existingReview ? 'Editar mi calificación' : 'Calificar Partido'}
            </button>

            {/* Se monta al abrir para partir siempre de los datos más recientes */}
            {isOpen && (
                <ReviewModal
                    matchId={matchId}
                    matchTitle={matchTitle}
                    matchDate={matchDate}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    isAuthenticated={isAuthenticated}
                    existingReview={existingReview}
                    existingMvpPlayerId={existingMvpPlayerId}
                    timesWatched={timesWatched}
                    initialRating={suggestedRating}
                />
            )}
        </>
    );
}
