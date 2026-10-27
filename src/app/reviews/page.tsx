import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MessageSquare, Sparkles } from 'lucide-react';
import UserReviewsList from '@/components/reviews/UserReviewsList';

export default async function ReviewsPage() {
    const session = await getSession();

    // Si no hay usuario autenticado
    if (!session?.user?.id && !session?.user?.email) {
        return (
            <div className="max-w-4xl mx-auto py-16 px-4 text-center pb-28">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 sm:p-12 backdrop-blur-md shadow-xl">
                    <MessageSquare className="w-12 h-12 text-emerald-400 mx-auto mb-4 opacity-80" />
                    <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Inicia sesión para ver tus reseñas</h1>
                    <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-6">
                        Guarda tus comentarios y calificaciones de tus partidos favoritos iniciando sesión en Matchbox.
                    </p>
                </div>
            </div>
        );
    }

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-28">
            {/* Encabezado Responsivo */}
            <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 shadow-inner">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            Mis Reseñas
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                            Historial personal de partidos que has calificado y analizado.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 self-start sm:self-center">
                    <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 text-emerald-400 text-xs sm:text-sm px-4 py-2 rounded-2xl font-bold shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 fill-emerald-400" />
                        {reviews.length} {reviews.length === 1 ? 'partido calificado' : 'partidos calificados'}
                    </span>
                </div>
            </div>

            {/* Subcomponente con Filtros y Lista */}
            <UserReviewsList initialReviews={reviews} userId={user.id} />
        </div>
    );
}