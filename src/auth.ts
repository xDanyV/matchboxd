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
        session({ session, user }) {
            if (session.user && user) {
                session.user.id = user.id;
                session.user.username = user.username ?? null;
            }
            return session;
        },
    },
});