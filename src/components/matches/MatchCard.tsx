'use client';

import Link from 'next/link';
import { MotionConfig, motion } from 'motion/react';
import { Star, CalendarDays, MessageSquare } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';

interface MatchCardTeam {
    name: string;
    slug: string;
    crestUrl?: string | null;
}

interface MatchCardProps {
    match: {
        id: string;
        homeTeam: MatchCardTeam;
        awayTeam: MatchCardTeam;
        homeScore: number;
        awayScore: number;
        stage?: string | null;
        season: string;
        date: Date;
        isIconic?: boolean;
        tags?: string[];
        averageRating?: number | null;
        _count?: { reviews: number };
    };
}

function TeamBlock({ team, side }: { team: MatchCardTeam; side: 'home' | 'away' }) {
    return (
        <motion.div
            initial={{ x: side === 'home' ? -12 : 12, y: 6 }}
            whileInView={{ x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
                duration: 0.45,
                delay: side === 'home' ? 0.08 : 0.16,
                ease: [0.22, 1, 0.36, 1],
            }}
            className="flex min-w-0 flex-col items-center gap-4 text-center"
        >
            <TeamLink
                slug={team.slug}
                name={team.name}
                className="group/team flex min-w-0 flex-col items-center gap-4"
            >
                <TeamCrest
                    name={team.name}
                    crestUrl={team.crestUrl}
                    size={56}
                    className="transition-transform duration-300 group-hover/team:scale-110"
                />
                <span className="line-clamp-2 min-h-10 text-sm font-bold leading-snug text-white transition-colors group-hover/team:text-emerald-400 sm:text-base">
                    {team.name}
                </span>
            </TeamLink>
        </motion.div>
    );
}

export default function MatchCard({ match }: MatchCardProps) {
    const formattedDate = new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(match.date));

    return (
        <MotionConfig reducedMotion="user">
          <motion.article
              initial={{ y: 18 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              data-ui="match-card"
              className="group relative min-h-[21rem] overflow-hidden rounded-3xl bg-slate-900 p-5 sm:min-h-[22rem] sm:p-6"
          >
            <svg
                aria-hidden="true"
                viewBox="0 0 640 400"
                preserveAspectRatio="xMidYMid slice"
                className="pointer-events-none absolute inset-0 h-full w-full text-slate-500 opacity-[0.12]"
            >
                <rect x="1" y="1" width="638" height="398" rx="42" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M320 1v398M1 100h105v200H1m638-200H534v200h105M1 145h48v110H1m638-110h-48v110h48" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="320" cy="200" r="70" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="320" cy="200" r="3" fill="currentColor" />
            </svg>

            <Link
                href={`/matches/${match.id}`}
                aria-label={`Ver partido: ${match.homeTeam.name} vs ${match.awayTeam.name}`}
                className="absolute inset-0 z-0 rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
            />

            <div className="pointer-events-none relative z-10 flex h-full min-h-[18.5rem] flex-col justify-between sm:min-h-[19.5rem]">
                <div className="flex min-h-8 items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-slate-300 sm:text-sm">
                        {match.stage || 'Partido'} <span className="text-slate-500">·</span> {match.season}
                    </span>

                    {match.isIconic && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                            Icónico
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 py-5 sm:gap-3">
                    <TeamBlock team={match.homeTeam} side="home" />
                    <div
                        role="img"
                        className="flex items-center gap-0.5 text-3xl font-black tracking-tight text-white sm:gap-1 sm:text-4xl"
                        aria-label={`Marcador: ${match.homeScore} a ${match.awayScore}`}
                    >
                        <span className="tabular-nums">{match.homeScore}</span>
                        <span className="text-emerald-400">:</span>
                        <span className="tabular-nums">{match.awayScore}</span>
                    </div>
                    <TeamBlock team={match.awayTeam} side="away" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-3 text-xs font-medium text-slate-300 sm:text-sm">
                    <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-white">
                            {match.averageRating ? match.averageRating.toFixed(1) : 'S/R'}
                        </span>
                        <span className="text-slate-400">/ 10</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="flex items-center gap-1.5">
                            <MessageSquare className="h-4 w-4 text-slate-400" />
                            <span>{match._count?.reviews || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            <time dateTime={new Date(match.date).toISOString()} className="capitalize">
                                {formattedDate}
                            </time>
                        </div>
                    </div>
                </div>
            </div>
          </motion.article>
        </MotionConfig>
    );
}