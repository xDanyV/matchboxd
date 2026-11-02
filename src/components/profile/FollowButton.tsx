'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCheck, UserPlus } from 'lucide-react';
import { toggleFollow } from '@/app/actions/follow';
import { loginHref } from '@/lib/login';

interface FollowButtonProps {
    targetUserId: string;
    initialFollowing: boolean;
    isLoggedIn: boolean;
    /** Página a la que volver tras iniciar sesión */
    returnTo: string;
    size?: 'md' | 'sm';
}

export default function FollowButton({ targetUserId, initialFollowing, isLoggedIn, returnTo, size = 'md' }: FollowButtonProps) {
    const router = useRouter();
    const [following, setFollowing] = useState(initialFollowing);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const sizing = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm';
    const base = `inline-flex min-h-9 items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${sizing}`;

    if (!isLoggedIn) {
        return (
            <Link href={loginHref(returnTo)} className={`${base} bg-emerald-500 text-slate-950 hover:bg-emerald-400`}>
                <UserPlus className="w-4 h-4" />
                Seguir
            </Link>
        );
    }

    const handleClick = () => {
        const next = !following;
        setFollowing(next);
        setError(null);
        startTransition(async () => {
            const result = await toggleFollow(targetUserId);
            if (!result.success) {
                setFollowing(!next);
                setError(result.error);
                return;
            }
            setFollowing(result.following);
            // Actualiza los contadores de seguidores que pinta el servidor
            router.refresh();
        });
    };

    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={handleClick}
                disabled={isPending}
                aria-pressed={following}
                className={`${base} disabled:opacity-70 ${following
                    ? 'group bg-slate-950/80 border border-slate-700 text-slate-200 hover:border-rose-500/40 hover:text-rose-300'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    }`}
            >
                {following ? (
                    <>
                        <UserCheck className="w-4 h-4" />
                        <span className="group-hover:hidden">Siguiendo</span>
                        <span className="hidden group-hover:inline">Dejar de seguir</span>
                    </>
                ) : (
                    <>
                        <UserPlus className="w-4 h-4" />
                        Seguir
                    </>
                )}
            </button>
            {error && <p role="alert" className="text-[11px] text-rose-400 max-w-48">{error}</p>}
        </div>
    );
}
