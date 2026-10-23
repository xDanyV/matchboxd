"use client";

import { Share2 } from 'lucide-react';

export default function ShareButton({ match }: { match: any }) {
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                text: `Mira el partido entre ${match.homeTeam.name} y ${match.awayTeam.name}!`,
                url: window.location.href,
            });
        }
    };
    return (
        <button
            aria-label="Compartir partido"
            className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 
            transition-all active:scale-95 hover:border-slate-700 
            hover:text-emerald-400 hover:shadow-lg shadow-emerald-400/20"
            onClick={handleShare}
        >
            <Share2 className="w-4 h-4 transition-transform " />
        </button>
    );
}