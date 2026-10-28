'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isReportReason, REPORT_DETAILS_MAX_LENGTH } from '@/lib/moderation';
import { checkRateLimit } from '@/lib/auto-moderation';

type ActionResult = { success: true } | { success: false; error: string };

// Con sesiones en base de datos el rol se lee en cada petición: quitarle el rol a alguien surte efecto al instante
async function getViewer() {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return null;
    return { id, isAdmin: session?.user?.role === 'ADMIN' };
}

function revalidateReviewPages(matchId: string) {
    revalidatePath(`/matches/${matchId}`);
    revalidatePath('/reviews');
    revalidatePath('/u/[username]', 'page');
    revalidatePath('/admin/reports');
}

/** Borra una reseña. Puede hacerlo su autor o un admin. El diario y el voto MVP se conservan. */
export async function deleteReview(reviewId: string): Promise<ActionResult> {
    const viewer = await getViewer();
    if (!viewer) return { success: false, error: 'Debes iniciar sesión.' };

    const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true, matchId: true } });
    if (!review) return { success: false, error: 'La reseña ya no existe.' };

    if (review.userId !== viewer.id && !viewer.isAdmin) {
        return { success: false, error: 'No puedes borrar esta reseña.' };
    }

    // Likes, comentarios y reportes se borran en cascada
    await prisma.review.delete({ where: { id: reviewId } });

    revalidateReviewPages(review.matchId);
    return { success: true };
}

/** Borra un comentario. Puede hacerlo su autor, el autor de la reseña comentada o un admin. */
export async function deleteComment(commentId: string): Promise<ActionResult> {
    const viewer = await getViewer();
    if (!viewer) return { success: false, error: 'Debes iniciar sesión.' };

    const comment = await prisma.reviewComment.findUnique({
        where: { id: commentId },
        select: { userId: true, review: { select: { userId: true, matchId: true } } },
    });
    if (!comment) return { success: false, error: 'El comentario ya no existe.' };

    const canDelete = comment.userId === viewer.id || comment.review.userId === viewer.id || viewer.isAdmin;
    if (!canDelete) return { success: false, error: 'No puedes borrar este comentario.' };

    await prisma.reviewComment.delete({ where: { id: commentId } });

    revalidateReviewPages(comment.review.matchId);
    return { success: true };
}

interface ReportInput {
    reviewId?: string;
    commentId?: string;
    reason: string;
    details?: string;
}

/** Reporta una reseña o un comentario ajeno. Cada usuario puede reportar una vez cada contenido. */
export async function reportContent(input: ReportInput): Promise<ActionResult> {
    const viewer = await getViewer();
    if (!viewer) return { success: false, error: 'Debes iniciar sesión para reportar.' };

    if (Boolean(input.reviewId) === Boolean(input.commentId)) {
        return { success: false, error: 'Reporte no válido.' };
    }
    if (!isReportReason(input.reason)) return { success: false, error: 'Elige un motivo.' };

    const rateLimitError = await checkRateLimit('report', viewer.id);
    if (rateLimitError) return { success: false, error: rateLimitError };

    const details = input.details?.trim() || null;
    if (details && details.length > REPORT_DETAILS_MAX_LENGTH) {
        return { success: false, error: `Los detalles no pueden superar ${REPORT_DETAILS_MAX_LENGTH} caracteres.` };
    }

    const authorId = input.reviewId
        ? (await prisma.review.findUnique({ where: { id: input.reviewId }, select: { userId: true } }))?.userId
        : (await prisma.reviewComment.findUnique({ where: { id: input.commentId }, select: { userId: true } }))?.userId;

    if (!authorId) return { success: false, error: 'Ese contenido ya no existe.' };
    if (authorId === viewer.id) return { success: false, error: 'No puedes reportar tu propio contenido.' };

    try {
        await prisma.report.create({
            data: {
                reason: input.reason,
                details,
                reporterId: viewer.id,
                reviewId: input.reviewId ?? null,
                commentId: input.commentId ?? null,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: 'Ya habías reportado este contenido.' };
        }
        throw error;
    }

    revalidatePath('/admin/reports');
    return { success: true };
}

/** Admin: descarta todos los reportes pendientes de un contenido porque no infringe nada. */
export async function dismissReports(target: { reviewId?: string; commentId?: string }): Promise<ActionResult> {
    const viewer = await getViewer();
    if (!viewer?.isAdmin) return { success: false, error: 'Solo los moderadores pueden hacer esto.' };

    if (Boolean(target.reviewId) === Boolean(target.commentId)) {
        return { success: false, error: 'Reporte no válido.' };
    }

    await prisma.report.updateMany({
        where: {
            status: 'PENDING',
            ...(target.reviewId ? { reviewId: target.reviewId } : { commentId: target.commentId }),
        },
        data: { status: 'DISMISSED' },
    });

    revalidatePath('/admin/reports');
    return { success: true };
}
