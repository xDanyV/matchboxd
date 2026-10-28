import Link from 'next/link';
import { Calendar, MapPin, Sparkles, Trophy, UserCheck } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';
import { ReviewTagChip } from '@/components/reviews/ReviewTagChip';

interface MatchHeaderSectionProps {
    match: any;
    tagSummary: { leading: string[] };
    formattedDate: string;
}

export default function MatchHeaderSection({ match, tagSummary, formattedDate }: MatchHeaderSectionProps) {
    return (
        <section className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-8 md:p-10 backdrop-blur-sm shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300">
                    <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="uppercase tracking-wider">
                        {match.competition.name} {match.stage ? `• ${match.stage}` : ''} ({match.season})
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {tagSummary.leading.slice(0, 3).map((slug: string) => (
                        <ReviewTagChip key={slug} slug={slug} size="md" highlight title="Etiqueta más votada" />
                    ))}
                    {match.isIconic && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Partido Icónico</span>
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-2">
                {/* Local */}
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 text-center md:text-left">
                    <TeamLink slug={match.homeTeam.slug} name={match.homeTeam.name} className="shrink-0 transition-transform hover:scale-105">
                        <TeamCrest name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} size={64} />
                    </TeamLink>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Local</span>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                            <Link href={`/teams/${match.homeTeam.slug}`} className="hover:text-emerald-400 transition-colors">
                                {match.homeTeam.name}
                            </Link>
                        </h1>
                    </div>
                </div>

                {/* Marcador */}
                <div className="flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800/80 rounded-2xl py-4 px-6 max-w-xs mx-auto w-full shadow-inner">
                    <div className="flex items-center gap-4 text-4xl sm:text-5xl font-black font-mono text-emerald-400">
                        <span>{match.homeScore}</span>
                        <span className="text-slate-600 text-2xl sm:text-3xl font-sans">-</span>
                        <span>{match.awayScore}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] sm:text-xs text-slate-400 font-medium text-center">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="capitalize">{formattedDate}</span>
                    </div>
                    {(match.homeHalfScore !== null || match.homePenalties !== null) && (
                        <div className="flex flex-wrap justify-center gap-x-3 mt-1.5 text-[11px] font-medium text-slate-500">
                            {match.homeHalfScore !== null && (
                                <span>Descanso {match.homeHalfScore}-{match.awayHalfScore}</span>
                            )}
                            {match.homePenalties !== null && (
                                <span className="font-bold text-amber-300">Penales {match.homePenalties}-{match.awayPenalties}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Visitante */}
                <div className="flex flex-col md:flex-row-reverse items-center justify-center md:justify-start gap-4 text-center md:text-right">
                    <TeamLink slug={match.awayTeam.slug} name={match.awayTeam.name} className="shrink-0 transition-transform hover:scale-105">
                        <TeamCrest name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} size={64} />
                    </TeamLink>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visitante</span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                            <Link href={`/teams/${match.awayTeam.slug}`} className="hover:text-emerald-400 transition-colors">
                                {match.awayTeam.name}
                            </Link>
                        </h2>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/60 text-xs sm:text-sm text-slate-400">
                {match.stadium && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{match.stadium}</span>
                    </div>
                )}
                {match.referee && (
                    <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Árbitro: {match.referee}</span>
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                    {match.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="text-[11px] sm:text-xs bg-slate-800/80 border border-slate-700/50 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}