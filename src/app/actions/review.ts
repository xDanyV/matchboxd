'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeReviewTags } from '@/lib/review-tags';
import { isValidRating } from '@/lib/rating';
import { parseMatchLogInput, type MatchLogInput } from '@/lib/diary';
import { BLOCKED_CONTENT_MESSAGE, checkContent } from '@/lib/content-filter';
import { checkRateLimit, clearAutomaticFlags, flagAutomatically } from '@/lib/auto-moderation';

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

type SubmitReviewResult = { success: true; reviewId: string } | { success: false; error: string };

// Los errores se devuelven en vez de lanzarse: en producción Next oculta el mensaje de un throw
export async function submitReview(data: SubmitReviewInput): Promise<SubmitReviewResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: 'Debes iniciar sesión para calificar este partido.' };
    }

    const userId = session.user.id;

    if (!isValidRating(data.rating)) {
        return { success: false, error: 'La calificación debe ir de 0.5 a 10, en pasos de medio punto.' };
    }

    const content = data.content?.trim() || null;
    // Un título sin texto no tiene sentido: se descarta
    const title = content ? data.title?.trim() || null : null;
    const hasSpoilers = content ? data.hasSpoilers || false : false;

    const filter = checkContent(title, content);
    if (filter.level === 'block') return { success: false, error: BLOCKED_CONTENT_MESSAGE };

    const rateLimitError = await checkRateLimit('review', userId);
    if (rateLimitError) return { success: false, error: rateLimitError };

    // Etiquetas: se validan en el servidor (catálogo, máximo y opuestas)
    const tags = data.tags === undefined ? undefined : sanitizeReviewTags(data.tags);

    const match = await prisma.match.findUnique({
        where: { id: data.matchId },
        select: { date: true, homeTeamId: true, awayTeamId: true, _count: { select: { players: true } } },
    });
    if (!match) return { success: false, error: 'El partido no existe.' };

    // El MVP tiene que ser alguien que jugó ese partido (o, sin alineación, de uno de los dos equipos)
    if (data.mvpPlayerId) {
        const candidate = match._count.players > 0
            ? await prisma.matchPlayer.findFirst({
                where: { matchId: data.matchId, playerId: data.mvpPlayerId, OR: [{ isStarter: true }, { minutes: { gt: 0 } }] },
                select: { id: true },
            })
            : await prisma.player.findFirst({
                where: { id: data.mvpPlayerId, teamId: { in: [match.homeTeamId, match.awayTeamId] } },
                select: { id: true },
            });
        if (!candidate) return { success: false, error: 'Ese jugador no participó en este partido.' };
    }

    let log: ReturnType<typeof parseMatchLogInput> | null = null;
    try {
        log = data.log ? parseMatchLogInput(data.log, match.date) : null;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'La entrada del diario no es válida.' };
    }

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

    // 4. Groserías: se publica, pero queda en la cola de moderación
    if (filter.level === 'flag') {
        await flagAutomatically({ reviewId: review.id }, filter.matches);
    } else {
        await clearAutomaticFlags({ reviewId: review.id });
    }

    // 5. Revalidar cache de rutas afectadas
    revalidatePath(`/matches/${data.matchId}`);
    revalidatePath('/');
    if (log) revalidatePath('/watchlist');

    return { success: true, reviewId: review.id };
}
