'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function toggleWatchlist(matchId: string) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    const userId = session.user.id;

    const existing = await prisma.watchlist.findUnique({
        where: {
            userId_matchId: {
                userId,
                matchId,
            },
        },
    });

    if (existing) {
        await prisma.watchlist.delete({
            where: {
                id: existing.id,
            },
        });
        revalidatePath(`/matches/${matchId}`);
        revalidatePath('/watchlist');
        return { isSaved: false };
    } else {
        await prisma.watchlist.create({
            data: {
                userId,
                matchId,
            },
        });
        revalidatePath(`/matches/${matchId}`);
        revalidatePath('/watchlist');
        return { isSaved: true };
    }
}