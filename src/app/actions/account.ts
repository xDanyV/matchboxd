'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type DeleteAccountResult = { success: true } | { success: false; error: string };

// Nombres de la cookie de sesión de Auth.js (con y sin HTTPS)
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

/**
 * Borra la cuenta y TODO lo que el usuario creó: reseñas (con sus likes y comentarios),
 * comentarios, reacciones, votos MVP, diario, Por Ver, reportes y sesiones. Las relaciones
 * del esquema están en cascada, así que basta con borrar al usuario.
 * Para evitar borrados accidentales hay que escribir el nombre de usuario.
 */
export async function deleteAccount(confirmation: string): Promise<DeleteAccountResult> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: 'Debes iniciar sesión.' };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    if (!user) return { success: false, error: 'La cuenta ya no existe.' };

    if (!user.username || confirmation.trim().toLowerCase() !== user.username.toLowerCase()) {
        return { success: false, error: 'Escribe tu nombre de usuario exactamente para confirmar.' };
    }

    await prisma.user.delete({ where: { id: userId } });

    // La sesión ya se borró en cascada; también se quita la cookie del navegador
    const cookieStore = await cookies();
    for (const name of SESSION_COOKIES) cookieStore.delete(name);

    revalidatePath('/', 'layout');
    return { success: true };
}
