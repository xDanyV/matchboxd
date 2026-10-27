'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteMatchLog } from '@/app/actions/diary';

export default function DeleteLogButton({ logId }: { logId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!window.confirm('¿Quitar esta entrada de tu diario? Tu calificación del partido se conserva.')) return;

        startTransition(async () => {
            try {
                await deleteMatchLog(logId);
                router.refresh();
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            aria-label="Quitar del diario"
            title="Quitar del diario"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
        >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
    );
}
