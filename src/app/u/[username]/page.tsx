import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Calendar, MessageSquare, Settings, ShieldCheck } from 'lucide-react';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import ReviewCardClient from '@/components/reviews/ReviewCardClient';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';
import ProfileStats from '@/components/profile/ProfileStats';
import DiaryList, { type DiaryEntry } from '@/components/profile/DiaryList';
import { getUserStats } from '@/lib/user-stats';

const DIARY_LIMIT = 10;

interface UserProfilePageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
    const { username } = await params;

    const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { name: true, username: true },
    });

    if (!user) return { title: 'Perfil no encontrado | Matchbox' };

    return { title: `${user.name ?? user.username} (@${user.username}) | Matchbox` };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
    const { username } = await params;

    const [session, user] = await Promise.all([
        getSession(),
        prisma.user.findUnique({
            where: { username: username.toLowerCase() },
            include: {
                favoriteTeam: true,
                // Solo reseñas con texto: las calificaciones sueltas viven en el diario y las estadísticas
                _count: { select: { reviews: { where: { content: { not: null } } } } },
                reviews: {
                    where: { content: { not: null } },
                    include: {
                        match: {
                            include: {
                                homeTeam: true,
                                awayTeam: true,
                                competition: true,
                            },
                        },
                        likes: true,
                        comments: {
                            include: {
                                user: { select: { name: true, image: true } },
                            },
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        }),
    ]);

    if (!user) notFound();

    const [stats, logs, ratings] = await Promise.all([
        getUserStats(user.id),
        prisma.matchLog.findMany({
            where: { userId: user.id },
            include: {
                match: {
                    select: {
                        id: true,
                        season: true,
                        stage: true,
                        homeTeam: { select: { name: true, shortName: true, crestUrl: true } },
                        awayTeam: { select: { name: true, shortName: true, crestUrl: true } },
                    },
                },
            },
            orderBy: [{ watchedOn: 'desc' }, { createdAt: 'desc' }],
            take: DIARY_LIMIT,
        }),
        prisma.review.findMany({ where: { userId: user.id }, select: { matchId: true, rating: true } }),
    ]);

    const ratingByMatch = new Map(ratings.map((review) => [review.matchId, review.rating]));
    const diaryEntries: DiaryEntry[] = logs.map((log) => ({
        id: log.id,
        watchedOn: log.watchedOn,
        method: log.method,
        isRewatch: log.isRewatch,
        match: log.match,
        rating: ratingByMatch.get(log.matchId) ?? null,
    }));

    const viewerId = session?.user?.id ?? '';
    const isOwner = viewerId !== '' && viewerId === user.id;
    const viewerIsAdmin = session?.user?.role === 'ADMIN';
    const displayName = user.name ?? user.username ?? 'Usuario';

    const memberSince = user.createdAt.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-28">
            {/* Cabecera del perfil */}
            <section className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                    {user.image ? (
                        <Image
                            src={user.image}
                            alt={displayName}
                            width={96}
                            height={96}
                            className="rounded-full border-2 border-emerald-500/40 shrink-0"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-3xl font-black text-emerald-400 shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                                {displayName}
                            </h1>
                            <p className="text-sm font-semibold text-emerald-400">@{user.username}</p>
                        </div>

                        {user.bio && (
                            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl whitespace-pre-line">
                                {user.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            {user.favoriteTeam && (
                                <TeamLink
                                    slug={user.favoriteTeam.slug}
                                    name={user.favoriteTeam.name}
                                    className="inline-flex items-center gap-2 bg-slate-800/90 border border-slate-700/50 hover:border-emerald-500/40 px-3 py-1.5 rounded-full text-slate-200 font-semibold transition-colors"
                                >
                                    <TeamCrest
                                        name={user.favoriteTeam.name}
                                        crestUrl={user.favoriteTeam.crestUrl}
                                        size={18}
                                        className="rounded-md"
                                    />
                                    <span className="text-slate-400 font-medium">Equipo favorito:</span>
                                    {user.favoriteTeam.shortName || user.favoriteTeam.name}
                                </TeamLink>
                            )}
                            <span className="inline-flex items-center gap-1.5 bg-slate-800/60 border border-slate-800 px-3 py-1.5 rounded-full text-slate-400 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                Miembro desde {memberSince}
                            </span>
                        </div>
                    </div>

                    {isOwner && (
                        <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                            <Link
                                href="/settings/profile"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs sm:text-sm font-bold transition-all w-fit sm:w-full"
                            >
                                <Settings className="w-4 h-4" />
                                Editar perfil
                            </Link>
                            {/* En móvil la barra inferior no tiene hueco: el acceso a moderación vive aquí */}
                            {viewerIsAdmin && (
                                <Link
                                    href="/admin/reports"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:border-amber-500/50 text-xs sm:text-sm font-bold transition-all w-fit sm:w-full"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    Moderación
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <ProfileStats stats={stats} />

            <DiaryList entries={diaryEntries} totalLogs={stats.totalLogs} isOwner={isOwner} />

            {/* Reseñas recientes */}
            <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-emerald-400" />
                        Reseñas recientes
                    </h2>
                    <span className="text-xs sm:text-sm text-slate-400 font-semibold">
                        {user._count.reviews} {user._count.reviews === 1 ? 'reseña' : 'reseñas'}
                    </span>
                </div>

                {user.reviews.length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-200">
                            {isOwner ? 'Aún no has escrito ninguna reseña' : 'Este usuario aún no ha escrito reseñas'}
                        </h3>
                        {isOwner && (
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-full text-sm transition-all"
                            >
                                Explorar Partidos
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {user.reviews.map((review) => {
                            const formattedDate = new Date(review.createdAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            });

                            const likesCount = review.likes.filter((l) => l.isLike).length;
                            const dislikesCount = review.likes.filter((l) => !l.isLike).length;

                            return (
                                <ReviewCardClient
                                    key={review.id}
                                    review={review}
                                    currentUserId={viewerId}
                                    isAdmin={viewerIsAdmin}
                                    formattedDate={formattedDate}
                                    likesCount={likesCount}
                                    dislikesCount={dislikesCount}
                                />
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}