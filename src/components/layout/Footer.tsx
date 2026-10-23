'use client';

import Link from 'next/link';
import { Trophy, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Footer() {
    return (
        <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-950 border-t border-slate-800/60 text-slate-400 py-8 px-4 sm:px-6 lg:px-8 pb-28 sm:pb-10 mt-auto"
        >
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">

                {/* Logo e identidad */}
                <Link href="/" className="inline-flex items-center gap-2 text-white font-black text-base tracking-tight group">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
                        <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <span>MATCHBOX</span>
                </Link>

                {/* Mensaje con corazón */}
                <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium cursor-default select-none">
                    Hecho con <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0 active:scale-125 cursor-pointer" /> para los fans del fútbol.
                </p>

                {/* Redes Sociales */}
                <div className="flex items-center gap-2.5 text-slate-400">
                    {/* SVG GitHub */}
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="GitHub"
                        className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:text-white hover:border-slate-700 transition-all"
                    >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                    </a>

                    {/* SVG Twitter / X */}
                    <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Twitter"
                        className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:text-white hover:border-slate-700 transition-all"
                    >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                    </a>
                </div>

            </div>
        </motion.footer>
    );
}