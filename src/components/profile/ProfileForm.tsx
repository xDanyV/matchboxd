'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/app/actions/profile';

interface TeamOption {
    id: string;
    name: string;
}

interface ProfileFormProps {
    initialUsername: string;
    initialBio: string;
    initialFavoriteTeamId: string;
    teams: TeamOption[];
}

const BIO_MAX_LENGTH = 160;

const inputClasses =
    'w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all';

export default function ProfileForm({
    initialUsername,
    initialBio,
    initialFavoriteTeamId,
    teams,
}: ProfileFormProps) {
    const router = useRouter();
    const [username, setUsername] = useState(initialUsername);
    const [bio, setBio] = useState(initialBio);
    const [favoriteTeamId, setFavoriteTeamId] = useState(initialFavoriteTeamId);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            const result = await updateProfile({
                username,
                bio,
                favoriteTeamId: favoriteTeamId || null,
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            router.push(`/u/${result.username}`);
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nombre de usuario
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) =>
                            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                        }
                        maxLength={20}
                        required
                        className={`${inputClasses} pl-8`}
                    />
                </div>
                <p className="text-xs text-slate-500">
                    3 a 20 caracteres: letras minúsculas, números o guion bajo.
                </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
                <label htmlFor="bio" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Bio
                </label>
                <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={BIO_MAX_LENGTH}
                    rows={3}
                    placeholder="Cuéntanos de qué equipo eres y qué tipo de partidos disfrutas…"
                    className={`${inputClasses} resize-none`}
                />
                <p className="text-xs text-slate-500 text-right">
                    {bio.length}/{BIO_MAX_LENGTH}
                </p>
            </div>

            {/* Equipo favorito */}
            <div className="space-y-2">
                <label htmlFor="favoriteTeam" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Equipo favorito
                </label>
                <select
                    id="favoriteTeam"
                    value={favoriteTeamId}
                    onChange={(e) => setFavoriteTeamId(e.target.value)}
                    className={inputClasses}
                >
                    <option value="">Sin equipo favorito</option>
                    {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                            {team.name}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                    {error}
                </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
                <Link
                    href={`/u/${initialUsername}`}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                    Cancelar
                </Link>
                <button
                    type="submit"
                    disabled={isPending || username.length < 3}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </div>
        </form>
    );
}