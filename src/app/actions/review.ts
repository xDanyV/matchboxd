'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeReviewTags } from '@/lib/review-tags';
import { parseMatchLogInput, type MatchLogInput } from '@/lib/diary';

interface SubmitReviewInput {
    matchId: string;
    rating: number;
    title?: string;
    // Opcional: sin texto, la reseña es solo una calificación
    content?: string;
    hasSpoilers?: boolean;
    mvpPlayerId?: string;
    tags?: string[];
    // Si viene, además se añade una entrada al diario
    log?: MatchLogInput;
}

export async function submitReview(data: SubmitReviewInput) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Debes iniciar sesion para calificar este partido.');
    }

    const userId = session.user.id;

    if (data.rating < 1 || data.rating > 10) {
        throw new Error('La calificacion debe estar entre 1 y 10.');
    }

    const content = data.content?.trim() || null;
    // Un título sin texto no tiene sentido: se descarta
    const title = content ? data.title?.trim() || null : null;
    const hasSpoilers = content ? data.hasSpoilers || false : false;

    // Etiquetas: se validan en el servidor (catálogo, máximo y opuestas)
    const tags = data.tags === undefined ? undefined : sanitizeReviewTags(data.tags);

    const match = await prisma.match.findUnique({ where: { id: data.matchId }, select: { date: true } });
    if (!match) throw new Error('El partido no existe.');

    const log = data.log ? parseMatchLogInput(data.log, match.date) : null;

    const review = await prisma.$transaction(async (tx) => {
        // 1. Guardar o actualizar la reseña
        const saved = await tx.review.upsert({
            where: {
                userId_matchId: {
                    userId,
                    matchId: data.matchId,
                },
            },
            update: {
                rating: data.rating,
                title,
                content,
                hasSpoilers,
                ...(tags !== undefined ? { tags } : {}),
            },
            create: {
                userId,
                matchId: data.matchId,
                rating: data.rating,
                title,
                content,
                hasSpoilers,
                tags: tags ?? [],
            },
        });

        // 2. Guardar o actualizar voto MVP si se selecciono jugador
        if (data.mvpPlayerId) {
            await tx.mvpVote.upsert({
                where: {
                    userId_matchId: {
                        userId,
                        matchId: data.matchId,
                    },
                },
                update: {
                    playerId: data.mvpPlayerId,
                },
                create: {
                    userId,
                    matchId: data.matchId,
                    playerId: data.mvpPlayerId,
                },
            });
        }

        // 3. Entrada de diario: al verlo, el partido deja de estar pendiente
        if (log) {
            await tx.matchLog.create({ data: { ...log, userId, matchId: data.matchId } });
            await tx.watchlist.deleteMany({ where: { userId, matchId: data.matchId } });
        }

        return saved;
    });

    // 4. Revalidar cache de rutas afectadas
    revalidatePath(`/matches/${data.matchId}`);
    revalidatePath('/');
    if (log) revalidatePath('/watchlist');

    return { success: true, reviewId: review.id };
}
