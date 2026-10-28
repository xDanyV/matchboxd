'use client';

import { useTransition } from 'react';
import { loginHref } from '@/lib/login';
import { useRouter } from 'next/navigation';
import { Eye, Loader2 } from 'lucide-react';
import { logMatch } from '@/app/actions/diary';
import { toDateInputValue } from '@/lib/watch-methods';

interface SeenButtonProps {
    matchId: string;
    timesWatched: number;
    isAuthenticated: boolean;
}

/** Registra un visionado de hoy sin calificar. Para más detalle está "Calificar Partido". */
export default function SeenButton({ matchId, timesWatched, isAuthenticated }: SeenButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (timesWatched > 0) {
        const label = `Visto ${timesWatched} ${timesWatched === 1 ? 'vez' : 'veces'}`;
        return (
            <span
                title={label}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border bg-emerald-500/10 border-emerald-500/40 text-emerald-400 text-xs font-bold"
            >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
            </span>
        );
    }

    const handleClick = () => {
        if (!isAuthenticated) {
            router.push(loginHref(window.location.pathname));
            return;
        }

        startTransition(async () => {
            try {
                await logMatch(matchId, { watchedOn: toDateInputValue(new Date()) });
                router.refresh();
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            title="Marcar como visto hoy"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
        >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">Marcar como visto</span>
        </button>
    );
}
