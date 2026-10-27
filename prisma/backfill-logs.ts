import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Crea una entrada de diario para cada reseña que aún no tenga ninguna.
 * Antes del diario, reseñar un partido era la única forma de marcarlo como visto.
 * Idempotente: si el usuario ya tiene un registro de ese partido, no hace nada.
 */
async function main() {
    const [reviews, logs] = await Promise.all([
        prisma.review.findMany({ select: { userId: true, matchId: true, createdAt: true } }),
        prisma.matchLog.findMany({ select: { userId: true, matchId: true }, distinct: ['userId', 'matchId'] }),
    ]);

    const logged = new Set(logs.map((log) => `${log.userId}:${log.matchId}`));
    const missing = reviews.filter((review) => !logged.has(`${review.userId}:${review.matchId}`));

    if (missing.length === 0) {
        console.log('✅ Todas las reseñas ya tienen su entrada en el diario.');
        return;
    }

    const { count } = await prisma.matchLog.createMany({
        data: missing.map((review) => ({
            userId: review.userId,
            matchId: review.matchId,
            watchedOn: review.createdAt,
        })),
    });

    // Lo que ya está en el diario deja de estar pendiente
    const { count: removed } = await prisma.watchlist.deleteMany({
        where: { OR: missing.map((review) => ({ userId: review.userId, matchId: review.matchId })) },
    });

    console.log(`✅ ${count} entradas creadas en el diario a partir de reseñas existentes.`);
    if (removed > 0) console.log(`🧹 ${removed} partidos ya vistos salieron de "Por Ver".`);
}

main()
    .catch((e) => {
        console.error('\n❌ El script se detuvo:', e instanceof Error ? e.message : e);
        console.error('Es seguro volver a ejecutarlo: solo crea las entradas que faltan.');
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
