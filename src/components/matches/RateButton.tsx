'use client';

import { useState } from 'react';
import ReviewModal from './ReviewModal';

interface Player {
    id: string;
    name: string;
    position: string | null;
}

interface Team {
    id: string;
    name: string;
    players: Player[];
}

interface RateButtonProps {
    matchId: string;
    matchTitle: string;
    homeTeam: Team;
    awayTeam: Team;
    isAuthenticated: boolean;
}

export default function RateButton({
    matchId,
    matchTitle,
    homeTeam,
    awayTeam,
    isAuthenticated,
}: RateButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
            >
                Calificar Partido
            </button>

            <ReviewModal
                matchId={matchId}
                matchTitle={matchTitle}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                isAuthenticated={isAuthenticated}
            />
        </>
    );
}