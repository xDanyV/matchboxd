'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Loader2, Trash2 } from 'lucide-react';
import { deleteComment, deleteReview } from '@/app/actions/moderation';
import ReportDialog from '@/components/moderation/ReportDialog';

interface ContentActionsProps {
    kind: 'review' | 'comment';
    id: string;
    authorId: string;
    /** Solo comentarios: el autor de la reseña también puede borrar los comentarios que recibe */
    reviewAuthorId?: string;
    currentUserId: string;
    isAdmin?: boolean;
    /** Para actualizar listas locales sin esperar al refresh */
    onDeleted?: () => void;
}

/**
 * Botones de borrar y reportar de una reseña o comentario. Solo decide qué mostrar:
 * los permisos reales se validan en el servidor.
 */
export default function ContentActions({
    kind,
    id,
    authorId,
    reviewAuthorId,
    currentUserId,
    isAdmin = false,
    onDeleted,
}: ContentActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [reporting, setReporting] = useState(false);

    if (!currentUserId) return null;

    const isAuthor = authorId === currentUserId;
    const canDelete = isAuthor || isAdmin || (kind === 'comment' && reviewAuthorId === currentUserId);
    const canReport = !isAuthor;
    const label = kind === 'review' ? 'reseña' : 'comentario';

    const handleDelete = () => {
        const warning = kind === 'review'
            ? '¿Borrar esta reseña? También se borran sus likes y comentarios. El diario se conserva.'
            : '¿Borrar este comentario?';
        if (!window.confirm(warning)) return;

        startTransition(async () => {
            const res = kind === 'review' ? await deleteReview(id) : await deleteComment(id);
            if (res.success) {
                onDeleted?.();
                router.refresh();
            } else {
                window.alert(res.error);
            }
        });
    };

    return (
        <div className="flex items-center gap-0.5">
            {canReport && (
                <button
                    type="button"
                    onClick={() => setReporting(true)}
                    aria-label={`Reportar ${label}`}
                    title={`Reportar ${label}`}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                    <Flag className="w-3.5 h-3.5" />
                </button>
            )}
            {canDelete && (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    aria-label={`Borrar ${label}`}
                    title={isAuthor ? `Borrar ${label}` : `Borrar ${label} (moderación)`}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
            )}

            {reporting && (
                <ReportDialog
                    target={kind === 'review' ? { reviewId: id } : { commentId: id }}
                    onClose={() => setReporting(false)}
                />
            )}
        </div>
    );
}
