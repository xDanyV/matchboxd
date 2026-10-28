"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, Share2 } from 'lucide-react';

type ShareFeedback = 'copied' | 'error' | null;

interface ShareButtonProps {
    match: { homeTeam: { name: string }; awayTeam: { name: string } };
}

export default function ShareButton({ match }: ShareButtonProps) {
    const [feedback, setFeedback] = useState<ShareFeedback>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const showFeedback = (value: ShareFeedback) => {
        setFeedback(value);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setFeedback(null), 2500);
    };

    const handleShare = async () => {
        const url = window.location.href;
        const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;

        // Menú nativo (móviles y algunos navegadores de escritorio)
        if (navigator.share) {
            try {
                await navigator.share({ title, text: `Mira el partido entre ${match.homeTeam.name} y ${match.awayTeam.name}!`, url });
                return;
            } catch (error) {
                // Cerrar el menú no es un error; cualquier otro fallo cae al portapapeles
                if (error instanceof DOMException && error.name === 'AbortError') return;
            }
        }

        // Respaldo: Firefox y otros navegadores sin Web Share
        try {
            await navigator.clipboard.writeText(url);
            showFeedback('copied');
        } catch {
            showFeedback('error');
        }
    };

    return (
        <div className="relative">
            <button
                aria-label="Compartir partido"
                className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400
                transition-all active:scale-95 hover:border-slate-700
                hover:text-emerald-400 hover:shadow-lg shadow-emerald-400/20"
                onClick={handleShare}
            >
                {feedback === 'copied' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                    <Share2 className="w-4 h-4 transition-transform " />
                )}
            </button>

            {/* Aviso accesible: los lectores de pantalla lo anuncian al aparecer */}
            <span
                role="status"
                className={`absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold shadow-lg transition-opacity z-20 ${feedback
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none'
                    } ${feedback === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-slate-900 border-emerald-500/30 text-emerald-300'
                    }`}
            >
                {feedback === 'copied' && 'Enlace copiado'}
                {feedback === 'error' && 'No se pudo copiar el enlace'}
            </span>
        </div>
    );
}
