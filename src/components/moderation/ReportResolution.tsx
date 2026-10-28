'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Trash2 } from 'lucide-react';
import { deleteComment, deleteReview, dismissReports } from '@/app/actions/moderation';

interface ReportResolutionProps {
    target: { reviewId: string } | { commentId: string };
}

export default function ReportResolution({ target }: ReportResolutionProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const isReview = 'reviewId' in target;

    const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
        startTransition(async () => {
            const res = await action();
            if (res.success) {
                router.refresh();
            } else {
                window.alert(res.error);
            }
        });
    };

    const handleRemove = () => {
        const label = isReview ? 'la reseña (con sus likes y comentarios)' : 'el comentario';
        if (!window.confirm(`¿Eliminar ${label}? No se puede deshacer.`)) return;
        run(() => ('reviewId' in target ? deleteReview(target.reviewId) : deleteComment(target.commentId)));
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => run(() => dismissReports(target))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
                <Check className="w-4 h-4" />
                Descartar
            </button>
            <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar {isReview ? 'reseña' : 'comentario'}
            </button>
        </div>
    );
}
