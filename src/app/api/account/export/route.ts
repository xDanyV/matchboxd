import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const matchSummary = {
    select: {
        id: true,
        date: true,
        season: true,
        stage: true,
        homeScore: true,
        awayScore: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
    },
} as const;

/**
 * "Descargar mis datos": todo lo que Matchbox guarda del usuario en un JSON.
 * Solo devuelve los datos de quien tiene la sesión iniciada.
 */
export async function GET() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            username: true,
            email: true,
            image: true,
            bio: true,
            role: true,
            createdAt: true,
            favoriteTeam: { select: { name: true } },
            // De la cuenta de Google solo guardamos qué cuenta es, nunca contraseñas ni tokens
            accounts: { select: { provider: true, providerAccountId: true } },
            reviews: {
                select: { rating: true, title: true, content: true, hasSpoilers: true, tags: true, createdAt: true, updatedAt: true, match: matchSummary },
                orderBy: { createdAt: 'asc' },
            },
            comments: {
                select: { content: true, createdAt: true, review: { select: { title: true, match: matchSummary } } },
                orderBy: { createdAt: 'asc' },
            },
            reviewLikes: { select: { isLike: true, createdAt: true, review: { select: { title: true, match: matchSummary } } } },
            mvpVotes: { select: { createdAt: true, player: { select: { name: true } }, match: matchSummary } },
            matchLogs: {
                select: { watchedOn: true, method: true, isRewatch: true, createdAt: true, match: matchSummary },
                orderBy: { watchedOn: 'asc' },
            },
            watchlist: { select: { createdAt: true, match: matchSummary } },
            reports: { select: { reason: true, details: true, status: true, createdAt: true } },
        },
    });

    if (!user) return NextResponse.json({ error: 'La cuenta no existe.' }, { status: 404 });

    const body = JSON.stringify({ exportedAt: new Date().toISOString(), ...user }, null, 2);
    const filename = `matchbox-datos-${user.username ?? 'usuario'}.json`;

    return new NextResponse(body, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            // Datos personales: que ningún caché intermedio los guarde
            'Cache-Control': 'no-store',
        },
    });
}
