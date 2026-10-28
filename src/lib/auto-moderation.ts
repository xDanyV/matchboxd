import { prisma } from '@/lib/prisma';

// -------------------------------------------------------------
// Límite de frecuencia (contado en la base de datos: sin Redis)
// -------------------------------------------------------------

const LIMITS = {
    comment: { max: 5, windowMs: 60_000, message: 'Vas muy rápido. Espera un minuto antes de volver a comentar.' },
    review: { max: 10, windowMs: 60_000, message: 'Vas muy rápido. Espera un minuto antes de volver a calificar.' },
    report: { max: 10, windowMs: 10 * 60_000, message: 'Has enviado muchos reportes seguidos. Inténtalo de nuevo en unos minutos.' },
} as const;

export type RateLimitedAction = keyof typeof LIMITS;

/** Devuelve el mensaje de error si el usuario superó el límite, o null si puede continuar. */
export async function checkRateLimit(action: RateLimitedAction, userId: string): Promise<string | null> {
    const { max, windowMs, message } = LIMITS[action];
    const since = new Date(Date.now() - windowMs);

    const count =
        action === 'comment'
            ? await prisma.reviewComment.count({ where: { userId, createdAt: { gte: since } } })
            : action === 'review'
                ? await prisma.review.count({ where: { userId, updatedAt: { gte: since } } })
                : await prisma.report.count({ where: { reporterId: userId, createdAt: { gte: since } } });

    return count >= max ? message : null;
}

// -------------------------------------------------------------
// Reportes automáticos del filtro de lenguaje
// -------------------------------------------------------------

type Target = { reviewId: string } | { commentId: string };

const targetWhere = (target: Target) =>
    'reviewId' in target ? { reviewId: target.reviewId } : { commentId: target.commentId };

/** Manda el contenido a la cola de moderación. Si ya tenía un aviso automático pendiente, solo lo actualiza. */
export async function flagAutomatically(target: Target, matches: string[]) {
    const details = `Detectado por el filtro: ${matches.join(', ')}`;
    const existing = await prisma.report.findFirst({
        where: { ...targetWhere(target), automatic: true, status: 'PENDING' },
        select: { id: true },
    });

    if (existing) {
        await prisma.report.update({ where: { id: existing.id }, data: { details } });
    } else {
        await prisma.report.create({ data: { ...targetWhere(target), automatic: true, reason: 'OFFENSIVE', details } });
    }
}

/** Si el autor edita y el texto queda limpio, el aviso automático pendiente ya no aplica. */
export async function clearAutomaticFlags(target: Target) {
    await prisma.report.updateMany({
        where: { ...targetWhere(target), automatic: true, status: 'PENDING' },
        data: { status: 'DISMISSED' },
    });
}
