'use client';

import { useState, useEffect } from 'react';
import TeamCrest from '@/components/teams/TeamCrest';

interface TeamFloatingHeaderProps {
    teamName: string;
    crestUrl: string | null;
}

export default function TeamFloatingHeader({ teamName, crestUrl }: TeamFloatingHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 280);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            className={`fixed top-[84px] left-0 right-0 z-40 transition-all duration-300 transform md:hidden px-4 ${isScrolled ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
                }`}
        >
            <div className="max-w-xs mx-auto bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl py-2 px-4 shadow-2xl flex items-center justify-center gap-3">
                <TeamCrest name={teamName} crestUrl={crestUrl} size={28} className="rounded-md shrink-0" />
                <span className="font-black text-white text-xs sm:text-sm tracking-tight truncate">{teamName}</span>
            </div>
        </div>
    );
}