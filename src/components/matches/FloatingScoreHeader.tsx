'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TeamCrest from '@/components/teams/TeamCrest';

interface FloatingScoreHeaderProps {
    homeTeam: { name: string; crestUrl: string | null; slug: string };
    awayTeam: { name: string; crestUrl: string | null; slug: string };
    homeScore: number;
    awayScore: number;
}

export default function FloatingScoreHeader({
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
}: FloatingScoreHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 250) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 transform md:hidden px-3 sm:px-6 ${isScrolled
                    ? 'translate-y-0 opacity-100 pointer-events-auto'
                    : '-translate-y-full opacity-0 pointer-events-none'
                }`}
        >
            <div className="max-w-xl mx-auto bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl py-3 px-5 shadow-2xl flex items-center justify-between gap-3 text-xs sm:text-sm">
                {/* Local */}
                <Link href={`/teams/${homeTeam.slug}`} className="flex items-center gap-2.5 min-w-0 flex-1 justify-end">
                    <span className="font-bold text-slate-100 truncate text-sm">{homeTeam.name}</span>
                    <TeamCrest name={homeTeam.name} crestUrl={homeTeam.crestUrl} size={32} />
                </Link>

                {/* Marcador */}
                <div className="px-4 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl font-mono font-black text-emerald-400 text-lg shrink-0 shadow-inner">
                    {homeScore} - {awayScore}
                </div>

                {/* Visitante */}
                <Link href={`/teams/${awayTeam.slug}`} className="flex items-center gap-2.5 min-w-0 flex-1 justify-start">
                    <TeamCrest name={awayTeam.name} crestUrl={awayTeam.crestUrl} size={32} />
                    <span className="font-bold text-slate-100 truncate text-sm">{awayTeam.name}</span>
                </Link>
            </div>
        </div>
    );
}