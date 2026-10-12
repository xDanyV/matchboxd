import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MessageSquare } from 'lucide-react';
import ReviewCardClient from '@/components/reviews/ReviewCardClient';

export default async function ReviewsPage() {
    const session = await auth();

    // Si no hay usuario autenticado, mostramos estado no autorizado
    if (!session?.user?.id && !session?.user?.email) {
        return (
            <div className="max-w-4xl mx-auto py-16 px-4 text-center">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 sm:p-12 backdrop-blur-sm">
                    <MessageSquare className="w-12 h-12 text-emerald-400 mx-auto mb-4 opacity-80" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Inicia sesión para ver tus reseñas</h1>
                    <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-6">
                        Guarda tus comentarios y calificaciones de tus partidos favoritos iniciando sesión.
                    </p>
                </div>
            </div>
        );
    }

    // Obtener el ID del usuario desde la base de datos mediante su email o ID
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { id: session.user.id || '' },
                { email: session.user.email || '' }
            ]
        }
    });

    if (!user) {
        return redirect('/');
    }

    // Consultar todas las reseñas del usuario incluyendo likes detallados y comentarios
    const reviews = await prisma.review.findMany({
        where: {
            userId: user.id
        },
        include: {
            match: {
                include: {
                    homeTeam: true,
                    awayTeam: true,
                    competition: true
                }
            },
            likes: true,
            comments: {
                include: {
                    user: {
                        select: {
                            name: true,
                            image: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {/* Encabezado */}
            <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                        <MessageSquare className="w-7 h-7 text-emerald-400" />
                        Mis Reseñas
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Historial de partidos que has calificado y reseñado.
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 w-fit">
                    Total: <span className="text-emerald-400 font-bold">{reviews.length}</span> {reviews.length === 1 ? 'reseña' : 'reseñas'}
                </div>
            </div>

            {/* Lista de Reseñas */}
            {reviews.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-10 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-200">Aún no has escrito ninguna reseña</h2>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto">
                        Explora los partidos disponibles y comparte tu opinión sobre el rendimiento de los equipos.
                    </p>
                    <Link
                        href="/matches"
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-full text-sm transition-all"
                    >
                        Explorar Partidos
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {reviews.map((review) => {
                        const formattedDate = new Date(review.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        });

                        const likesCount = review.likes ? review.likes.filter((l) => l.isLike).length : 0;
                        const dislikesCount = review.likes ? review.likes.filter((l) => !l.isLike).length : 0;

                        return (
                            <ReviewCardClient
                                key={review.id}
                                review={review}
                                currentUserId={user.id}
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