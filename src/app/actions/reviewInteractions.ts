'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Alternar Like / Dislike
export async function toggleReviewReaction(reviewId: string, userId: string, isLike: boolean) {
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
export async function addReviewComment(reviewId: string, userId: string, content: string) {
    try {
        if (!content.trim()) return { success: false, error: 'El comentario está vacío' };

        await prisma.reviewComment.create({
            data: {
                reviewId,
                userId,
                content,
            },
        });

        revalidatePath('/reviews');
        return { success: true };
    } catch (error) {
        console.error('Error adding comment:', error);
        return { success: false, error: 'No se pudo guardar el comentario' };
    }
}