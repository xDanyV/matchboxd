import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { FOLLOW_LISTS, isFollowListKind } from '@/lib/follows';
import FollowButton from '@/components/profile/FollowButton';

const LIST_LIMIT = 100;

interface FollowListPageProps {
    params: Promise<{ username: string; list: string }>;
}

export async function generateMetadata({ params }: FollowListPageProps): Promise<Metadata> {
    const { username, list } = await params;
    if (!isFollowListKind(list)) return { title: 'Página no encontrada | Matchbox' };
    return { title: `${FOLLOW_LISTS[list].title} de @${username.toLowerCase()} | Matchbox` };
}

export default async function FollowListPage({ params }: FollowListPageProps) {
    const { username, list } = await params;
    if (!isFollowListKind(list)) notFound();

    const [session, user] = await Promise.all([
        getSession(),
        prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true, username: true, name: true } }),
    ]);
    if (!user) notFound();

    const isFollowers = list === 'seguidores';
    const userSelect = { id: true, username: true, name: true, image: true, bio: true } as const;

    const [total, rows] = await Promise.all([
        prisma.follow.count({ where: isFollowers ? { followingId: user.id } : { followerId: user.id } }),
        prisma.follow.findMany({
            where: isFollowers ? { followingId: user.id } : { followerId: user.id },
            select: { follower: { select: userSelect }, following: { select: userSelect } },
            orderBy: { createdAt: 'desc' },
            take: LIST_LIMIT,
        }),
    ]);
    const people = rows.map((row) => (isFollowers ? row.follower : row.following)).filter((person) => person.username);

    // A quién de la lista sigue ya el visitante, para pintar cada botón en su estado
    const viewerId = session?.user?.id ?? null;
    const viewerFollowing = viewerId
        ? new Set(
            (
                await prisma.follow.findMany({
                    where: { followerId: viewerId, followingId: { in: people.map((person) => person.id) } },
                    select: { followingId: true },
                })
            ).map((row) => row.followingId),
        )
        : new Set<string>();

    const { title, empty } = FOLLOW_LISTS[list];
    const returnTo = `/u/${user.username}/${list}`;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-28">
            <div className="space-y-3">
                <Link
                    href={`/u/${user.username}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {user.name ?? `@${user.username}`}
                </Link>
                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-emerald-400" />
                    {title} <span className="text-slate-500 tabular-nums">({total})</span>
                </h1>
                <nav aria-label="Seguidores y seguidos" className="flex gap-2">
                    {(Object.keys(FOLLOW_LISTS) as (keyof typeof FOLLOW_LISTS)[]).map((kind) => (
                        <Link
                            key={kind}
                            href={`/u/${user.username}/${kind}`}
                            aria-current={kind === list ? 'page' : undefined}
                            className={`min-h-9 inline-flex items-center rounded-xl px-4 text-sm font-bold transition-colors ${kind === list
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            {FOLLOW_LISTS[kind].title}
                        </Link>
                    ))}
                </nav>
            </div>

            {people.length === 0 ? (
                <p className="text-center text-slate-400 py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
                    {empty}
                </p>
            ) : (
                <ul className="bg-slate-900/60 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/80">
                    {people.map((person) => {
                        const displayName = person.name ?? person.username ?? 'Usuario';
                        return (
                            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
                                <Link href={`/u/${person.username}`} className="flex flex-1 min-w-0 items-center gap-3 group">
                                    {person.image ? (
                                        <Image
                                            src={person.image}
                                            alt=""
                                            width={40}
                                            height={40}
                                            className="rounded-full border border-slate-700 shrink-0"
                                        />
                                    ) : (
                                        <span className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400 shrink-0">
                                            {displayName.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                            {displayName}
                                        </span>
                                        <span className="block truncate text-xs text-slate-400">@{person.username}</span>
                                    </span>
                                </Link>
                                {person.id !== viewerId && (
                                    <FollowButton
                                        targetUserId={person.id}
                                        initialFollowing={viewerFollowing.has(person.id)}
                                        isLoggedIn={viewerId !== null}
                                        returnTo={returnTo}
                                        size="sm"
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {total > people.length && (
                <p className="text-center text-xs text-slate-500">Se muestran los {people.length} más recientes.</p>
            )}
        </div>
    );
}
