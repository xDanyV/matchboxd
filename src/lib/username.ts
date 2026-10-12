import { prisma } from '@/lib/prisma';

function slugify(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '')
        .slice(0, 20);
}

export async function generateUniqueUsername(
    name?: string | null,
    email?: string | null
) {
    let base = slugify(name ?? '') || slugify(email?.split('@')[0] ?? '');
    if (base.length < 3) base = `${base}usuario`.slice(0, 20);

    let candidate = base;

    for (let i = 0; i < 10; i++) {
        const exists = await prisma.user.findUnique({
            where: { username: candidate },
            select: { id: true },
        });
        if (!exists) return candidate;
        candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return `${base}${Date.now().toString(36)}`;
}

export async function ensureUsername(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, name: true, email: true },
    });

    if (!user) return null;
    if (user.username) return user.username;

    const username = await generateUniqueUsername(user.name, user.email);
    await prisma.user.update({ where: { id: userId }, data: { username } });
    return username;
}