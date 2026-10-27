import { BarChart3, Eye, Repeat, Star, Ticket, CalendarDays } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';
import TeamLink from '@/components/teams/TeamLink';
import { ReviewTagChip } from '@/components/reviews/ReviewTagChip';
import type { UserStats } from '@/lib/user-stats';

function StatTile({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
    return (
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Icon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{label}</span>
            </div>
            <p className="text-2xl font-black text-white tabular-nums">{value}</p>
        </div>
    );
}

export default function ProfileStats({ stats }: { stats: UserStats }) {
    const maxBucket = Math.max(...stats.ratingDistribution, 1);
    const currentYear = new Date().getFullYear();

    return (
        <section className="space-y-5">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 border-b border-slate-800 pb-4">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
                Estadísticas
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatTile icon={Eye} label="Vistos" value={stats.matchesWatched} />
                <StatTile icon={CalendarDays} label={`En ${currentYear}`} value={stats.watchedThisYear} />
                <StatTile icon={Ticket} label="En el estadio" value={stats.stadiumVisits} />
                <StatTile icon={Repeat} label="Re-vistas" value={stats.rewatches} />
                <StatTile icon={Star} label="Calificados" value={stats.ratingsCount} />
                <StatTile
                    icon={Star}
                    label="Nota media"
                    value={stats.averageRating !== null ? stats.averageRating.toFixed(1) : '—'}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Distribución de notas */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Distribución de notas</h3>
                    {stats.ratingsCount > 0 ? (
                        <div className="flex items-end gap-1.5 h-28" role="img" aria-label="Cantidad de partidos por nota del 1 al 10">
                            {stats.ratingDistribution.map((count, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                                    <div
                                        title={`${count} ${count === 1 ? 'partido' : 'partidos'} con ${index + 1}`}
                                        className={`w-full rounded-t-md ${count > 0 ? 'bg-emerald-500/80' : 'bg-slate-800'}`}
                                        style={{ height: `${Math.max((count / maxBucket) * 100, 4)}%` }}
                                    />
                                    <span className="text-[10px] font-mono text-slate-500">{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 italic">Aún no hay calificaciones.</p>
                    )}
                </div>

                {/* Favoritos según la actividad */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Lo que más ve</h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">Equipo más visto</span>
                            {stats.topTeam ? (
                                <TeamLink
                                    slug={stats.topTeam.team.slug}
                                    name={stats.topTeam.team.name}
                                    className="inline-flex items-center gap-2 min-w-0 font-bold text-slate-100 hover:text-emerald-400 transition-colors"
                                >
                                    <TeamCrest name={stats.topTeam.team.name} crestUrl={stats.topTeam.team.crestUrl} size={20} />
                                    <span className="truncate">{stats.topTeam.team.shortName || stats.topTeam.team.name}</span>
                                    <span className="hidden sm:inline text-xs font-medium text-slate-500 shrink-0">
                                        {stats.topTeam.count} {stats.topTeam.count === 1 ? 'partido' : 'partidos'}
                                    </span>
                                </TeamLink>
                            ) : (
                                <span className="text-slate-600">—</span>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">Etiqueta favorita</span>
                            {stats.topTag ? (
                                <ReviewTagChip slug={stats.topTag.slug} count={stats.topTag.count} />
                            ) : (
                                <span className="text-slate-600">—</span>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">Reseñas escritas</span>
                            <span className="font-bold text-slate-100 tabular-nums">{stats.writtenReviews}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
