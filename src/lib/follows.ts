import { prisma } from '@/lib/prisma';

export interface FollowSummary {
    followers: number;
    following: number;
    /** "Me gusta" que han recibido sus reseñas */
    likesReceived: number;
    /** El visitante sigue a este usuario */
    viewerFollows: boolean;
    /** Este usuario sigue al visitante */
    followsViewer: boolean;
    /** Personas que el visitante sigue y que también siguen a este usuario (hasta 3) */
    knownFollowers: { username: string; name: string | null }[];
    knownFollowersCount: number;
}

/** Datos sociales del perfil: lo que da credibilidad a un usuario frente a quien lo visita. */
export async function getFollowSummary(
    userId: string,
    viewerId: string | null,
    db: Pick<typeof prisma, 'follow' | 'reviewLike'> = prisma,
): Promise<FollowSummary> {
    const isOtherViewer = viewerId !== null && viewerId !== userId;
    // Seguidores de este usuario a los que el visitante sigue
    const knownWhere = isOtherViewer
        ? { followingId: userId, follower: { username: { not: null }, followers: { some: { followerId: viewerId } } } }
        : null;

    const [followers, following, likesReceived, viewerFollows, followsViewer, known, knownCount] = await Promise.all([
        db.follow.count({ where: { followingId: userId } }),
        db.follow.count({ where: { followerId: userId } }),
        db.reviewLike.count({ where: { isLike: true, review: { userId } } }),
        isOtherViewer
            ? db.follow.count({ where: { followerId: viewerId, followingId: userId } }).then(Boolean)
            : false,
        isOtherViewer
            ? db.follow.count({ where: { followerId: userId, followingId: viewerId } }).then(Boolean)
            : false,
        knownWhere
            ? db.follow.findMany({
                where: knownWhere,
                select: { follower: { select: { username: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 3,
            })
            : [],
        knownWhere ? db.follow.count({ where: knownWhere }) : 0,
    ]);

    return {
        followers,
        following,
        likesReceived,
        viewerFollows,
        followsViewer,
        knownFollowers: known.map(({ follower }) => ({ username: follower.username ?? '', name: follower.name })),
        knownFollowersCount: knownCount,
    };
}

export const FOLLOW_LISTS = {
    seguidores: { title: 'Seguidores', empty: 'Todavía no lo sigue nadie.' },
    siguiendo: { title: 'Siguiendo', empty: 'Todavía no sigue a nadie.' },
} as const;

export type FollowListKind = keyof typeof FOLLOW_LISTS;

export function isFollowListKind(value: string): value is FollowListKind {
    return Object.hasOwn(FOLLOW_LISTS, value);
}
