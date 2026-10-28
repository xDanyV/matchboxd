import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Flame, Bookmark, MessageSquare, LogIn, LogOut, User, Home, ShieldCheck } from 'lucide-react';
import { signIn, signOut } from '@/auth';
import { getSession } from '@/lib/session';
import GlobalSearch from '@/components/search/GlobalSearch';

export default async function Navbar() {
    const session = await getSession();

    return (
        <>
            {/* Navbar Principal / Superior (Escritorio y cabecera general) */}
            <header className="sticky top-0 z-50 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20 gap-4 sm:gap-8">

                        {/* Logotipo Oficial */}
                        <Link href="/" className="flex items-center gap-3 shrink-0 group select-none">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                                <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                                MATCH<span className="text-emerald-400">BOX</span>
                            </span>
                        </Link>

                        {/* Buscador Global (Oculto en móvil pequeño si se desea, o visible arriba) */}
                        <div className="flex-1 max-w-md mx-2 hidden sm:block">
                            <GlobalSearch />
                        </div>

                        {/* Enlaces y Estado de Sesión (Escritorio) */}
                        <nav className="hidden md:flex items-center gap-2 lg:gap-4">
                            <Link
                                href="/matches"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-200 hover:text-amber-400 hover:bg-slate-900/70 transition-all"
                            >
                                <Flame className="w-4.5 h-4.5 text-amber-400 shrink-0 fill-amber-400/20" />
                                <span>Top Partidos</span>
                            </Link>

                            <Link
                                href="/watchlist"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-emerald-400 hover:bg-slate-900/70 transition-all"
                            >
                                <Bookmark className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                                <span>Por Ver</span>
                            </Link>

                            {session?.user && (
                                <Link
                                    href="/reviews"
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-emerald-400 hover:bg-slate-900/70 transition-all"
                                >
                                    <MessageSquare className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                                    <span>Mis Reseñas</span>
                                </Link>
                            )}

                            {session?.user?.role === 'ADMIN' && (
                                <Link
                                    href="/admin/reports"
                                    aria-label="Moderación"
                                    title="Moderación"
                                    className="flex items-center p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-slate-900/70 transition-all"
                                >
                                    <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
                                </Link>
                            )}

                            {session?.user ? (
                                <div className="flex items-center gap-2.5 pl-2">
                                    <Link
                                        href="/profile"
                                        className="rounded-full transition-transform hover:scale-105"
                                    >
                                        {session.user.image ? (
                                            <Image
                                                src={session.user.image}
                                                alt={session.user.name || 'Avatar'}
                                                width={36}
                                                height={36}
                                                className="rounded-full border border-emerald-500/40"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-xs text-emerald-400">
                                                {session.user.name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                    </Link>

                                    <form
                                        action={async () => {
                                            'use server';
                                            await signOut();
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            title="Cerrar sesión"
                                            className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <form
                                    action={async () => {
                                        'use server';
                                        await signIn();
                                    }}
                                >
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        <span>Ingresar</span>
                                    </button>
                                </form>
                            )}
                        </nav>

                        {/* Buscador móvil rápido en la cabecera si hace falta */}
                        <div className="flex sm:hidden items-center">
                            <GlobalSearch />
                        </div>
                    </div>
                </div>
            </header>

            {/* Barra de Navegación Inferior para Móviles */}
            <nav aria-label="Navegación móvil" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2.5 shadow-2xl">
                <div className="flex items-center justify-around">
                    {/* Enlaces con diseño compacto */}
                    <Link
                        href="/"
                        className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Inicio</span>
                    </Link>

                    <Link
                        href="/matches"
                        className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-amber-400 transition-colors"
                    >
                        <Flame className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Top</span>
                    </Link>

                    <Link
                        href="/watchlist"
                        className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                        <Bookmark className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Por Ver</span>
                    </Link>

                    {session?.user && (
                        <Link
                            href="/reviews"
                            className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Reseñas</span>
                        </Link>
                    )}

                    {/* Perfil / Ingresar */}
                    {session?.user ? (
                        <div className="relative group">
                            <button
                                aria-label="Menú de usuario"
                                className="flex flex-col items-center gap-1 px-3 py-1 text-slate-300 focus:outline-none"
                            >
                                {session.user.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || 'Avatar'}
                                        width={22}
                                        height={22}
                                        className="rounded-full border border-emerald-500/60"
                                    />
                                ) : (
                                    <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center font-bold text-[10px] text-emerald-400">
                                        {session.user.name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <span className="text-[10px] font-medium">Perfil</span>
                            </button>

                            {/* Ventana flotante hacia arriba con posición segura */}
                            <div className="absolute bottom-14 right-0 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 hidden group-hover:block group-focus-within:block space-y-1">
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/80 hover:text-emerald-400 transition-colors"
                                >
                                    <User className="w-4 h-4 text-emerald-400" />
                                    <span>Ver Perfil</span>
                                </Link>

                                <form
                                    action={async () => {
                                        'use server';
                                        await signOut();
                                    }}
                                >
                                    <button
                                        type="submit"
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Cerrar sesión</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <form
                            action={async () => {
                                'use server';
                                await signIn();
                            }}
                        >
                            <button
                                type="submit"
                                aria-label="Ingresar"
                                className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                <LogIn className="w-5 h-5" />
                                <span className="text-[10px] font-medium">Entrar</span>
                            </button>
                        </form>
                    )}
                </div>
            </nav>
        </>
    );
}