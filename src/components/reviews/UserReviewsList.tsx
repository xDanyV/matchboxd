'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
    Search,
    MessageSquare,
    ChevronDown,
    Calendar,
    Clock,
    Star,
    Flame,
    SlidersHorizontal,
    Check
} from 'lucide-react';
import ReviewCardClient from '@/components/reviews/ReviewCardClient';

interface UserReviewsListProps {
    initialReviews: any[];
    userId: string;
}

type SortOption = 'newest' | 'oldest' | 'rating-desc' | 'rating-asc' | 'likes';

const SORT_OPTIONS: { id: SortOption; label: string; icon: any }[] = [
    { id: 'newest', label: 'Más recientes', icon: Calendar },
    { id: 'oldest', label: 'Más antiguas', icon: Clock },
    { id: 'rating-desc', label: 'Mayor calificación', icon: Star },
    { id: 'rating-asc', label: 'Menor calificación', icon: Star },
    { id: 'likes', label: 'Más populares', icon: Flame },
];

export default function UserReviewsList({ initialReviews, userId }: UserReviewsListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedSortOption = SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0];
    const SelectedIcon = selectedSortOption.icon;

    const filteredAndSortedReviews = useMemo(() => {
        return initialReviews
            .filter((review) => {
                const homeName = review.match?.homeTeam?.name?.toLowerCase() || '';
                const awayName = review.match?.awayTeam?.name?.toLowerCase() || '';
                const content = review.content?.toLowerCase() || '';
                const term = searchTerm.toLowerCase();

                return homeName.includes(term) || awayName.includes(term) || content.includes(term);
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                if (sortBy === 'oldest') {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                if (sortBy === 'rating-desc') {
                    return b.rating - a.rating;
                }
                if (sortBy === 'rating-asc') {
                    return a.rating - b.rating;
                }
                if (sortBy === 'likes') {
                    const aLikes = a.likes ? a.likes.filter((l: any) => l.isLike).length : 0;
                    const bLikes = b.likes ? b.likes.filter((l: any) => l.isLike).length : 0;
                    return bLikes - aLikes;
                }
                return 0;
            });
    }, [initialReviews, searchTerm, sortBy]);

    if (initialReviews.length === 0) {
        return (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 sm:p-12 text-center space-y-4 backdrop-blur-md shadow-xl">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                    <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                    <h2 className="text-lg font-bold text-slate-200">Aún no has escrito ninguna reseña</h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                        Explora los partidos disponibles y comparte tu opinión sobre el rendimiento de los equipos.
                    </p>
                </div>
                <div className="pt-2">
                    <Link
                        href="/matches"
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        Explorar Partidos
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Contenedor con z-30 para evitar que las tarjetas de abajo tapen el menú */}
            <div className="relative z-30 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 sm:p-4 rounded-3xl backdrop-blur-md shadow-lg">

                {/* Buscador */}
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por equipo o comentario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800/80 rounded-2xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 transition-all"
                    />
                </div>

                {/* Custom Dropdown Estilizado con z-50 */}
                <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full sm:w-auto flex items-center justify-between gap-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-200 transition-all shadow-sm active:scale-98"
                    >
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-400 hidden sm:inline">Ordenar:</span>
                            <div className="flex items-center gap-1.5 text-white">
                                <SelectedIcon className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{selectedSortOption.label}</span>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Menú Flotante con z-50 e índice alto de capas */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-12 sm:top-14 w-full sm:w-56 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-2xl space-y-1">
                            {SORT_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isSelected = option.id === sortBy;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                            setSortBy(option.id);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isSelected
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                                            <span>{option.label}</span>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Resultados de la lista con z-10 */}
            {filteredAndSortedReviews.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-6">
                    <p className="text-slate-400 text-xs sm:text-sm">No se encontraron reseñas que coincidan con "{searchTerm}".</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 relative z-10">
                    {filteredAndSortedReviews.map((review) => {
                        const formattedDate = new Date(review.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        });

                        const likesCount = review.likes ? review.likes.filter((l: any) => l.isLike).length : 0;
                        const dislikesCount = review.likes ? review.likes.filter((l: any) => !l.isLike).length : 0;

                        return (
                            <ReviewCardClient
                                key={review.id}
                                review={review}
                                currentUserId={userId}
                                formattedDate={formattedDate}
                                likesCount={likesCount}
                                dislikesCount={dislikesCount}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}