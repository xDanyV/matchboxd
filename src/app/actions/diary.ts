'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parseMatchLogInput, type MatchLogInput } from '@/lib/diary';

/** Registra un visionado sin calificar ("Marcar como visto"). */
export async function logMatch(matchId: string, input: MatchLogInput) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Debes iniciar sesión para registrar un partido.');
    }

    const userId = session.user.id;

    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { date: true } });
    if (!match) throw new Error('El partido no existe.');

    const data = parseMatchLogInput(input, match.date);

    // Al verlo deja de estar pendiente
    await prisma.$transaction([
        prisma.matchLog.create({ data: { ...data, userId, matchId } }),
        prisma.watchlist.deleteMany({ where: { userId, matchId } }),
    ]);

    revalidatePath(`/matches/${matchId}`);
    revalidatePath('/watchlist');

    return { success: true };
}

export async function deleteMatchLog(logId: string) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Debes iniciar sesión para editar tu diario.');
    }

    const { count } = await prisma.matchLog.deleteMany({
        where: { id: logId, userId: session.user.id },
    });

    if (count === 0) throw new Error('No se encontró esa entrada en tu diario.');

    revalidatePath('/u/[username]', 'page');

    return { success: true };
}
