'use client';

import Link from 'next/link';
import { Trophy, Search, Flame, Bookmark, User } from 'lucide-react';

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
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

                    {/* Buscador Central */}
                    <div className="hidden sm:flex flex-1 max-w-lg relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar partido, equipo o jugador..."
                            className="w-full bg-slate-900/90 border border-slate-800 rounded-full pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition-colors"
                        />
                    </div>

                    {/* Acciones y Enlaces */}
                    <nav className="flex items-center gap-2 sm:gap-4">
                        <Link
                            href="/matches"
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-200 hover:text-amber-400 hover:bg-slate-900/70 transition-all"
                        >
                            <Flame className="w-4.5 h-4.5 text-amber-400 shrink-0 fill-amber-400/20" />
                            <span>Top Partidos</span>
                        </Link>

                        <Link
                            href="/watchlist"
                            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-emerald-400 hover:bg-slate-900/70 transition-all"
                        >
                            <Bookmark className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                            <span>Por Ver</span>
                        </Link>

                        <button
                            aria-label="Perfil de usuario"
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-4 py-2 rounded-full text-sm font-semibold text-slate-200 transition-all active:scale-95 ml-1"
                        >
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="hidden sm:inline">Perfil</span>
                        </button>
                    </nav>

                </div>
            </div>
        </header>
    );
}