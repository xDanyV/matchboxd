'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface SubmitReviewInput {
    matchId: string;
    rating: number;
    title?: string;
    content: string;
    hasSpoilers?: boolean;
    mvpPlayerId?: string;
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

    if (!data.content.trim()) {
        throw new Error('El contenido de la reseña no puede estar vacio.');
    }

    // 1. Guardar o actualizar la reseña
    const review = await prisma.review.upsert({
        where: {
            userId_matchId: {
                userId,
                matchId: data.matchId,
            },
        },
        update: {
            rating: data.rating,
            title: data.title?.trim() || null,
            content: data.content.trim(),
            hasSpoilers: data.hasSpoilers || false,
        },
        create: {
            userId,
            matchId: data.matchId,
            rating: data.rating,
            title: data.title?.trim() || null,
            content: data.content.trim(),
            hasSpoilers: data.hasSpoilers || false,
        },
    });

    // 2. Guardar o actualizar voto MVP si se selecciono jugador
    if (data.mvpPlayerId) {
        await prisma.mvpVote.upsert({
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

    // 3. Revalidar cache de rutas afectadas
    revalidatePath(`/matches/${data.matchId}`);
    revalidatePath('/');

    return { success: true, reviewId: review.id };
}