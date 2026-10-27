import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { generateUniqueUsername } from '@/lib/username';

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
    ],
    events: {
        async createUser({ user }) {
            if (!user.id) return;
            const username = await generateUniqueUsername(user.name, user.email);
            await prisma.user.update({
                where: { id: user.id },
                data: { username },
            });
        },
    },
    callbacks: {
        // Con sesiones en base de datos, `session` trae la fila completa (sessionToken, userId)
        // y `user` todas las columnas del usuario. Se devuelve solo lo que usa la app,
        // porque este objeto también se expone en /api/auth/session.
        session({ session, user }) {
            return {
                expires: session.expires,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    username: user.username ?? null,
                },
            };
        },
    },
});