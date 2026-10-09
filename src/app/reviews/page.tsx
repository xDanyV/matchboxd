import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MessageSquare, Star, Heart, Calendar, LogIn } from 'lucide-react';

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

    // Consultar todas las reseñas del usuario
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
            _count: {
                select: {
                    likes: true
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

                        return (
                            <article
                                key={review.id}
                                className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 transition-all space-y-4 backdrop-blur-sm"
                            >
                                {/* Cabecera del Partido */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                                    <Link
                                        href={`/matches/${review.match.id}`}
                                        className="flex items-center gap-3 group/item hover:opacity-90 transition-opacity"
                                    >
                                        <div className="flex items-center gap-2 font-bold text-slate-100 text-sm sm:text-base">
                                            {review.match.homeTeam.crestUrl && (
                                                <Image
                                                    src={review.match.homeTeam.crestUrl}
                                                    alt={review.match.homeTeam.name}
                                                    width={24}
                                                    height={24}
                                                    className="object-contain"
                                                />
                                            )}
                                            <span className="group-hover/item:text-emerald-400 transition-colors">
                                                {review.match.homeTeam.shortName || review.match.homeTeam.name}
                                            </span>
                                            <span className="bg-slate-800 px-2 py-0.5 rounded text-xs font-mono text-emerald-400">
                                                {review.match.homeScore} - {review.match.awayScore}
                                            </span>
                                            <span className="group-hover/item:text-emerald-400 transition-colors">
                                                {review.match.awayTeam.shortName || review.match.awayTeam.name}
                                            </span>
                                            {review.match.awayTeam.crestUrl && (
                                                <Image
                                                    src={review.match.awayTeam.crestUrl}
                                                    alt={review.match.awayTeam.name}
                                                    width={24}
                                                    height={24}
                                                    className="object-contain"
                                                />
                                            )}
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="bg-slate-800/90 border border-slate-700/50 px-2.5 py-1 rounded-md font-medium text-slate-300">
                                            {review.match.competition.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                            {formattedDate}
                                        </span>
                                    </div>
                                </div>

                                {/* Calificación y Título */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 font-bold text-xs sm:text-sm">
                                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                            <span>{review.rating.toFixed(1)}</span>
                                        </div>
                                        {review.title && (
                                            <h2 className="text-base sm:text-lg font-bold text-white">
                                                {review.title}
                                            </h2>
                                        )}
                                    </div>
                                </div>

                                {/* Contenido de la Reseña */}
                                <div className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                                    {review.hasSpoilers ? (
                                        <details className="cursor-pointer group">
                                            <summary className="text-amber-400/90 text-xs font-semibold select-none group-open:mb-2">
                                                Esta reseña contiene spoilers (haz clic para leer)
                                            </summary>
                                            <p className="text-slate-300 pt-1">{review.content}</p>
                                        </details>
                                    ) : (
                                        <p>{review.content}</p>
                                    )}
                                </div>

                                {/* Pie de tarjeta con likes */}
                                <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Heart className="w-4 h-4 text-rose-500/80 fill-rose-500/20" />
                                        <span>{review._count.likes} {review._count.likes === 1 ? 'me gusta' : 'me gusta'}</span>
                                    </div>

                                    <Link
                                        href={`/matches/${review.match.id}`}
                                        className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                                    >
                                        Ver partido completo →
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}