import Link from 'next/link';
import { GitBranch, Trophy } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import type { KnockoutRound, KnockoutTie } from '@/lib/knockout';

function TieCard({ tie, isFinal }: { tie: KnockoutTie; isFinal: boolean }) {
    const decided = tie.winnerId !== null;

    return (
        <div className={`rounded-xl border bg-slate-950/70 overflow-hidden ${isFinal ? 'border-amber-500/40' : 'border-slate-800'}`}>
            {tie.teams.map((team, i) => {
                const won = tie.winnerId === team.id;
                return (
                    <div
                        key={team.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 ${i === 0 ? 'border-b border-slate-800/80' : ''} ${decided && !won ? 'opacity-50' : ''}`}
                    >
                        <TeamCrest name={team.name} crestUrl={team.crestUrl} size={18} />
                        <Link
                            href={`/teams/${team.slug}`}
                            className={`flex-1 min-w-0 truncate text-xs hover:text-emerald-400 transition-colors ${won ? 'font-black text-white' : 'font-semibold text-slate-300'}`}
                        >
                            {team.shortName || team.name}
                        </Link>
                        {tie.penalties && (
                            <span className="text-[10px] font-mono text-amber-300/80" title="Penales">({tie.penalties[i]})</span>
                        )}
                        <span className={`w-5 text-right text-xs font-mono font-black tabular-nums ${won ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {tie.aggregate[i]}
                        </span>
                    </div>
                );
            })}
            {/* Ida y vuelta: cada resultado lleva a su partido */}
            <div className="flex divide-x divide-slate-800/80 border-t border-slate-800/80 bg-slate-900/50">
                {tie.legs.map((leg, i) => (
                    <Link
                        key={leg.id}
                        href={`/matches/${leg.id}`}
                        title={`${leg.homeTeam.name} ${leg.homeScore}-${leg.awayScore} ${leg.awayTeam.name}`}
                        className="flex-1 py-1 text-center text-[10px] font-mono text-slate-500 hover:text-emerald-400 hover:bg-slate-800/50 transition-colors"
                    >
                        {tie.legs.length > 1 ? (i === 0 ? 'Ida ' : 'Vuelta ') : ''}
                        {leg.homeScore}-{leg.awayScore}
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function KnockoutBracket({ rounds }: { rounds: KnockoutRound[] }) {
    if (rounds.length === 0) return null;

    const final = rounds.find((r) => r.stage === 'Final');
    const champion = final?.ties[0]?.winnerId
        ? final.ties[0].teams.find((t) => t.id === final.ties[0].winnerId)
        : null;

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-emerald-400" />
                    Fase eliminatoria
                </h2>
                {champion && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-200">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        Campeón: {champion.name}
                    </span>
                )}
            </div>

            {/* En pantallas chicas el cuadro se desliza dentro de su tarjeta */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 overflow-x-auto snap-x snap-mandatory">
                <div className="flex gap-4 min-w-max">
                    {rounds.map((round) => (
                        <div key={round.stage} className="w-52 shrink-0 snap-start flex flex-col">
                            <h3 className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {round.label}
                            </h3>
                            {/* justify-around alinea cada llave a la altura de las que la alimentan */}
                            <div className="flex-1 flex flex-col justify-around gap-3">
                                {round.ties.map((tie) => (
                                    <TieCard key={tie.key} tie={tie} isFinal={round.stage === 'Final'} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <p className="text-[11px] text-slate-500 sm:hidden">Desliza el cuadro para ver todas las rondas.</p>
        </section>
    );
}
