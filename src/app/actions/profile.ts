'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const BIO_MAX_LENGTH = 160;

interface UpdateProfileInput {
    username: string;
    bio?: string;
    favoriteTeamId?: string | null;
}

type UpdateProfileResult =
    | { success: true; username: string }
    | { success: false; error: string };

export async function updateProfile(data: UpdateProfileInput): Promise<UpdateProfileResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: 'Debes iniciar sesión para editar tu perfil.' };
    }

    const userId = session.user.id;
    const username = data.username.trim().toLowerCase();
    const bio = (data.bio ?? '').trim();

    if (!USERNAME_REGEX.test(username)) {
        return {
            success: false,
            error: 'El usuario debe tener entre 3 y 20 caracteres: letras, números o guion bajo.',
        };
    }

    if (bio.length > BIO_MAX_LENGTH) {
        return { success: false, error: `La bio no puede superar ${BIO_MAX_LENGTH} caracteres.` };
    }

    if (data.favoriteTeamId) {
        const team = await prisma.team.findUnique({
            where: { id: data.favoriteTeamId },
            select: { id: true },
        });
        if (!team) {
            return { success: false, error: 'El equipo seleccionado no existe.' };
        }
    }

    const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
    });

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                username,
                bio: bio || null,
                favoriteTeamId: data.favoriteTeamId || null,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: 'Ese nombre de usuario ya está en uso.' };
        }
        throw error;
    }

    revalidatePath(`/u/${username}`);
    if (current?.username && current.username !== username) {
        revalidatePath(`/u/${current.username}`);
    }
    revalidatePath('/settings/profile');

    return { success: true, username };
}