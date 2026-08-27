'use client';

import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { toggleWatchlist } from '@/app/actions/watchlist';

interface WatchlistButtonProps {
    matchId: string;
    initialIsSaved: boolean;
}

export default function WatchlistButton({ matchId, initialIsSaved }: WatchlistButtonProps) {
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        const nextState = !isSaved;
        setIsSaved(nextState);

        startTransition(async () => {
            try {
                const res = await toggleWatchlist(matchId);
                setIsSaved(res.isSaved);
            } catch (error) {
                setIsSaved(!nextState);
            }
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            aria-label={isSaved ? 'Quitar de Por Ver' : 'Guardar en Por Ver'}
            title={isSaved ? 'Quitar de Por Ver' : 'Guardar en Por Ver'}
            className={`p-2 rounded-full border transition-all active:scale-95 ${isSaved
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700'
                }`}
        >
            <Bookmark
                className={`w-4 h-4 transition-transform ${isSaved ? 'fill-emerald-400 stroke-emerald-400' : ''
                    }`}
            />
        </button>
    );
}