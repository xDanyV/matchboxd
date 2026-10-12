import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureUsername } from '@/lib/username';
import ProfileForm from '@/components/profile/ProfileForm';

export default async function ProfileSettingsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/api/auth/signin?callbackUrl=/settings/profile');
    }

    const username = await ensureUsername(session.user.id);

    const [user, teams] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { bio: true, favoriteTeamId: true },
        }),
        prisma.team.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
        }),
    ]);

    if (!user || !username) redirect('/');

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <Link
                href={`/u/${username}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition-all"
            >
                <ArrowLeft className="w-4 h-4" />
                Volver al perfil
            </Link>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Editar perfil</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Tu foto y nombre vienen de tu cuenta de Google.
                    </p>
                </div>

                <ProfileForm
                    initialUsername={username}
                    initialBio={user.bio ?? ''}
                    initialFavoriteTeamId={user.favoriteTeamId ?? ''}
                    teams={teams}
                />
            </div>
        </div>
    );
}