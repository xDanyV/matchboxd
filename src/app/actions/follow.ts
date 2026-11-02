'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/auto-moderation';

export type ToggleFollowResult =
    | { success: true; following: boolean; followers: number }
    | { success: false; error: string };

/** Sigue o deja de seguir a otro usuario. El seguidor siempre sale de la sesión, nunca del cliente. */
export async function toggleFollow(targetUserId: string): Promise<ToggleFollowResult> {
    const session = await getSession();
    const viewerId = session?.user?.id;
    if (!viewerId) return { success: false, error: 'Inicia sesión para seguir a otros usuarios.' };
    if (typeof targetUserId !== 'string' || targetUserId === viewerId) {
        return { success: false, error: 'No puedes seguirte a ti mismo.' };
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { username: true } });
    if (!target) return { success: false, error: 'Ese usuario ya no existe.' };

    const key = { followerId_followingId: { followerId: viewerId, followingId: targetUserId } };
    const existing = await prisma.follow.findUnique({ where: key, select: { followerId: true } });

    if (existing) {
        await prisma.follow.delete({ where: key });
    } else {
        const rateLimitError = await checkRateLimit('follow', viewerId);
        if (rateLimitError) return { success: false, error: rateLimitError };
        // upsert: dos clics casi simultáneos no deben fallar por la clave duplicada
        await prisma.follow.upsert({
            where: key,
            create: { followerId: viewerId, followingId: targetUserId },
            update: {},
        });
    }

    const followers = await prisma.follow.count({ where: { followingId: targetUserId } });

    const viewer = await prisma.user.findUnique({ where: { id: viewerId }, select: { username: true } });
    for (const username of [target.username, viewer?.username]) {
        if (username) revalidatePath(`/u/${username}`, 'layout');
    }

    return { success: true, following: !existing, followers };
}
