'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, Search, Star, ThumbsUp, ArrowUpDown } from 'lucide-react';

interface Review {
    id: string;
    rating: number;
    title: string | null;
    content: string;
    createdAt: Date | string;
    user: {
        name: string | null;
        username: string | null; // <-- Cambia a string | null
    };
    _count: {
        likes: number;
    };
}

interface ReviewSectionProps {
    initialReviews: Review[];
}

export default function ReviewSection({ initialReviews }: ReviewSectionProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest' | 'likes'>('recent');

    const filteredAndSortedReviews = useMemo(() => {
        return initialReviews
            .filter((review) => {
                const query = searchQuery.toLowerCase();
                const contentMatch = review.content.toLowerCase().includes(query);
                const titleMatch = review.title?.toLowerCase().includes(query) ?? false;
                const authorMatch =
                    review.user.name?.toLowerCase().includes(query) ||
                    review.user.username?.toLowerCase().includes(query);

                return contentMatch || titleMatch || authorMatch;
            })
            .sort((a, b) => {
                if (sortBy === 'recent') {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                if (sortBy === 'highest') {
                    return b.rating - a.rating;
                }
                if (sortBy === 'lowest') {
                    return a.rating - b.rating;
                }
                if (sortBy === 'likes') {
                    return b._count.likes - a._count.likes;
                }
                return 0;
            });
    }, [initialReviews, searchQuery, sortBy]);

    return (
        <section className="space-y-4 sm:space-y-6 pt-4">
            {/* Encabezado con Contador */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight font-sans">
                        Reseñas y Análisis ({initialReviews.length})
                    </h3>
                </div>

                {/* Controles: Buscador y Filtros */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Buscador */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar en reseñas o usuario..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>

                    {/* Selector de Ordenamiento */}
                    <div className="relative flex items-center">
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer appearance-none font-medium"
                        >
                            <option value="recent">Más recientes</option>
                            <option value="highest">Mejor valorados</option>
                            <option value="lowest">Menor valoración</option>
                            <option value="likes">Más populares</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Muro de Reseñas Filtradas */}
            {filteredAndSortedReviews.length > 0 ? (
                <div className="space-y-4">
                    {filteredAndSortedReviews.map((review) => (
                        <article
                            key={review.id}
                            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                                        {review.user.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                                            {review.user.name || review.user.username || 'Usuario'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(
                                                new Date(review.createdAt)
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span>{review.rating.toFixed(1)}</span>
                                </div>
                            </div>

                            {review.title && (
                                <h4 className="text-sm sm:text-base font-bold text-slate-100">{review.title}</h4>
                            )}

                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                {review.content}
                            </p>

                            <div className="pt-2 flex items-center gap-4 text-xs text-slate-500">
                                <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    <span>{review._count.likes} likes</span>
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 p-8 space-y-2">
                    <p className="text-sm font-medium text-slate-400">
                        {searchQuery
                            ? 'No se encontraron reseñas que coincidan con tu búsqueda.'
                            : 'Aún no hay reseñas para este partido.'}
                    </p>
                    <p className="text-xs text-slate-500">
                        {searchQuery
                            ? 'Intenta con otros términos o limpia el filtro.'
                            : '¡Sé el primero en calificarlo y dejar tu opinión!'}
                    </p>
                </div>
            )}
        </section>
    );
}