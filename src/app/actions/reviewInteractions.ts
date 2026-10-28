'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { BLOCKED_CONTENT_MESSAGE, checkContent } from '@/lib/content-filter';
import { checkRateLimit, flagAutomatically } from '@/lib/auto-moderation';

const COMMENT_MAX_LENGTH = 1000;

type InteractionResult = { success: true } | { success: false; error: string };

// El usuario sale siempre de la sesión del servidor: una server action es un endpoint
// público y cualquier id que llegue del cliente puede estar manipulado.
async function getUserId() {
    const session = await auth();
    return session?.user?.id ?? null;
}

// Alternar Like / Dislike
export async function toggleReviewReaction(reviewId: string, isLike: boolean): Promise<InteractionResult> {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Debes iniciar sesión para reaccionar.' };

    try {
        const existing = await prisma.reviewLike.findUnique({
            where: {
                userId_reviewId: { userId, reviewId },
            },
        });

        if (existing) {
            if (existing.isLike === isLike) {
                // Si ya dio el mismo click, lo borramos (toggle off)
                await prisma.reviewLike.delete({
                    where: { id: existing.id },
                });
            } else {
                // Si cambió de opinión (ej. de like a dislike)
                await prisma.reviewLike.update({
                    where: { id: existing.id },
                    data: { isLike },
                });
            }
        } else {
            // Crear nueva reacción
            await prisma.reviewLike.create({
                data: { userId, reviewId, isLike },
            });
        }

        revalidatePath('/reviews');
        return { success: true };
    } catch (error) {
        console.error('Error toggling reaction:', error);
        return { success: false, error: 'No se pudo registrar la reacción' };
    }
}

// Agregar Comentario
export async function addReviewComment(reviewId: string, content: string): Promise<InteractionResult> {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Debes iniciar sesión para comentar.' };

    const text = content.trim();
    if (!text) return { success: false, error: 'El comentario está vacío' };
    if (text.length > COMMENT_MAX_LENGTH) {
        return { success: false, error: `El comentario no puede superar ${COMMENT_MAX_LENGTH} caracteres.` };
    }

    const filter = checkContent(text);
    if (filter.level === 'block') return { success: false, error: BLOCKED_CONTENT_MESSAGE };

    const rateLimitError = await checkRateLimit('comment', userId);
    if (rateLimitError) return { success: false, error: rateLimitError };

    try {
        const comment = await prisma.reviewComment.create({
            data: {
                reviewId,
                userId,
                content: text,
            },
        });

        // Groserías: se publica, pero queda en la cola de moderación
        if (filter.level === 'flag') await flagAutomatically({ commentId: comment.id }, filter.matches);

        revalidatePath('/reviews');
        return { success: true };
    } catch (error) {
        console.error('Error adding comment:', error);
        return { success: false, error: 'No se pudo guardar el comentario' };
    }
}
