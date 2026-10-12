'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, X } from 'lucide-react';
import { toggleReviewReaction, addReviewComment } from '@/app/actions/reviewInteractions';

interface Comment {
    id: string;
    content: string;
    createdAt: Date;
    user: {
        name: string | null;
        image: string | null;
    };
}

interface ReviewLikeRecord {
    userId: string;
    isLike: boolean;
}

interface ReviewCommentsModalProps {
    review: {
        id: string;
        title: string | null;
        content: string;
        rating: number;
        match?: {
            homeTeam: { name: string };
            awayTeam: { name: string };
            homeScore: number;
            awayScore: number;
        };
        likes: ReviewLikeRecord[];
        comments: Comment[];
    };
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ReviewCommentsModal({
    review,
    currentUserId,
    isOpen,
    onClose,
}: ReviewCommentsModalProps) {
    const router = useRouter();
    const [commentText, setCommentText] = useState('');
    const [isPending, startTransition] = useTransition();

    // Estados locales para reflejar los likes y comentarios al instante
    const [localLikes, setLocalLikes] = useState<ReviewLikeRecord[]>(review.likes);
    const [localComments, setLocalComments] = useState<Comment[]>(review.comments);

    // Sincronizar si el prop de review cambia desde fuera
    useEffect(() => {
        setLocalLikes(review.likes);
        setLocalComments(review.comments);
    }, [review]);

    if (!isOpen) return null;

    const handleReaction = (isLike: boolean) => {
        
        setLocalLikes((prevLikes) => {
            const existingIndex = prevLikes.findIndex((l) => l.userId === currentUserId);
            if (existingIndex > -1) {
                const current = prevLikes[existingIndex];
                if (current.isLike === isLike) {
                    return prevLikes.filter((_, idx) => idx !== existingIndex);
                } else {
                    const copy = [...prevLikes];
                    copy[existingIndex] = { ...current, isLike };
                    return copy;
                }
            } else {
                return [...prevLikes, { userId: currentUserId, isLike }];
            }
        });

        startTransition(async () => {
            const res = await toggleReviewReaction(review.id, currentUserId, isLike);
            if (res.success) {
                router.refresh();
            }
        });
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        const tempComment: Comment = {
            id: Date.now().toString(),
            content: commentText,
            createdAt: new Date(),
            user: {
                name: 'Tú',
                image: null,
            },
        };

        setLocalComments((prev) => [tempComment, ...prev]);
        const textToSend = commentText;
        setCommentText('');

        startTransition(async () => {
            const res = await addReviewComment(review.id, currentUserId, textToSend);
            if (res.success) {
                router.refresh();
                onClose(); //
            }
        });
    };

    // Calcular contadores basados en el estado local
    const likesCount = localLikes.filter((l) => l.isLike).length;
    const dislikesCount = localLikes.filter((l) => !l.isLike).length;
    const userReaction = localLikes.find((l) => l.userId === currentUserId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                {/* Cabecera del Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            {review?.match?.homeTeam?.name || 'Local'} {review?.match?.homeScore ?? 0} - {review?.match?.awayScore ?? 0} {review?.match?.awayTeam?.name || 'Visitante'}
                        </span>
                        <h3 className="text-lg font-black text-white truncate">
                            {review.title || 'Reseña de Partido'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cuerpo con Reseña y Comentarios */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Contenido de la Reseña */}
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                ⭐ {review.rating?.toFixed(1) || '0.0'} / 10
                            </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{review.content}</p>

                        {/* Botones de Reacción (Likes / Dislikes) */}
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-800/60">
                            <button
                                onClick={() => handleReaction(true)}
                                disabled={isPending}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${userReaction?.isLike === true
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                <ThumbsUp className="w-4 h-4" />
                                <span>{likesCount}</span>
                            </button>

                            <button
                                onClick={() => handleReaction(false)}
                                disabled={isPending}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${userReaction?.isLike === false
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                <ThumbsDown className="w-4 h-4" />
                                <span>{dislikesCount}</span>
                            </button>
                        </div>
                    </div>

                    {/* Sección de Comentarios */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-emerald-400" />
                            <span>Comentarios ({localComments.length})</span>
                        </h4>

                        <div className="space-y-3">
                            {localComments.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-2">
                                    No hay comentarios aún. ¡Sé el primero en iniciar la conversación!
                                </p>
                            ) : (
                                localComments.map((comment) => (
                                    <div key={comment.id} className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">
                                                {comment.user.name || 'Usuario Anónimo'}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300">{comment.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Input para Nuevo Comentario */}
                <form onSubmit={handleAddComment} className="p-4 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escribe un comentario sobre esta reseña..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={isPending || !commentText.trim()}
                        className="inline-flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>

            </div>
        </div>
    );
}