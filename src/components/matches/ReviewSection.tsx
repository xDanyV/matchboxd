'use client';

import { useState } from 'react';
import { MessageSquare, Star, Heart } from 'lucide-react';
import ReviewCommentsModal from '@/components/reviews/ReviewCommentsModal';
import { ReviewTagList } from '@/components/reviews/ReviewTagChip';
import ContentActions from '@/components/moderation/ContentActions';

interface ReviewSectionProps {
    initialReviews: any[];
    currentUserId: string;
    isAdmin?: boolean;
}

export default function ReviewSection({ initialReviews, currentUserId, isAdmin = false }: ReviewSectionProps) {
    const [selectedReview, setSelectedReview] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filtrado dinámico por texto de reseña o nombre de usuario
    const filteredReviews = initialReviews.filter((review) => {
        const contentMatch = review.content.toLowerCase().includes(searchQuery.toLowerCase());
        const titleMatch = review.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const userMatch = review.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return contentMatch || titleMatch || userMatch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    <span>Reseñas y Análisis ({initialReviews.length})</span>
                </h3>

                {/* Buscador de reseñas */}
                <div className="w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Buscar en reseñas o usuario..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {filteredReviews.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6 text-center">
                        No se encontraron reseñas que coincidan con la búsqueda.
                    </p>
                ) : (
                    filteredReviews.map((review) => {
                        const likesCount = review.likes ? review.likes.filter((l: any) => l.isLike).length : 0;
                        const commentsCount = review.comments ? review.comments.length : 0;
                        const formattedDate = new Date(review.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        });

                        return (
                            <article
                                key={review.id}
                                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 backdrop-blur-sm transition-all hover:border-slate-700/80"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                                            {review.user?.name ? review.user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-white block">
                                                {review.user?.name || 'Usuario Anónimo'}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{formattedDate}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-400 font-bold text-xs">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        <span>{review.rating.toFixed(1)}</span>
                                    </div>
                                </div>

                                {review.title && (
                                    <h4 className="text-sm font-bold text-white">{review.title}</h4>
                                )}

                                <ReviewTagList tags={review.tags} />

                                <p className={`text-slate-300 text-xs sm:text-sm leading-relaxed inline-block cursor-default ${review.hasSpoilers ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>
                                    {review.content}
                                </p>

                                {/* Acciones de Likes y Comentarios */}
                                <div className="flex items-center gap-4 pt-2 border-t border-slate-800/60">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                                        <span>{likesCount} likes</span>
                                    </div>

                                    <button
                                        onClick={() => setSelectedReview(review)}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 transition-colors"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>Comentar ({commentsCount})</span>
                                    </button>

                                    <div className="ml-auto">
                                        <ContentActions
                                            kind="review"
                                            id={review.id}
                                            authorId={review.userId}
                                            currentUserId={currentUserId}
                                            isAdmin={isAdmin}
                                        />
                                    </div>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>

            {/* Modal interactivo de comentarios y reacciones */}
            {selectedReview && (
                <ReviewCommentsModal
                    review={selectedReview}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    isOpen={!!selectedReview}
                    onClose={() => setSelectedReview(null)}
                />
            )}
        </div>
    );
}