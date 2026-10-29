import Link from 'next/link';
import { Database, History, Route } from 'lucide-react';
import TeamCrest from '@/components/teams/TeamCrest';

export interface CareerEntry {
    teamApiId: number;
    teamName: string;
    teamLogo: string | null;
    seasons: number[];
    /** Página del equipo en Matchbox, si lo tenemos cargado */
    teamSlug: string | null;
}

export interface MatchboxSeason {
    season: string;
    clubs: { name: string; slug: string; crestUrl: string | null; matches: number }[];
}

export interface DataCoverage {
    matches: number;
    firstMatch: Date | null;
    lastMatch: Date | null;
    seasons: string[];
    lastUpdated: Date | null;
}

interface PlayerCareerTabProps {
    career: CareerEntry[];
    careerSyncedAt: Date | null;
    matchboxSeasons: MatchboxSeason[];
    coverage: DataCoverage;
}

/** 2024 -> "2024/25" */
const seasonLabel = (year: number) => `${year}/${String(year + 1).slice(-2)}`;

/** [2026, 2025, 2024, 2021] -> "2021/22 · 2024/25 – 2026/27" (agrupa temporadas seguidas) */
export function formatSeasonRanges(seasons: number[]): string {
    const sorted = [...new Set(seasons)].sort((a, b) => a - b);
    const ranges: [number, number][] = [];
    for (const year of sorted) {
        const last = ranges[ranges.length - 1];
        if (last && year === last[1] + 1) last[1] = year;
        else ranges.push([year, year]);
    }
    return ranges
        .map(([from, to]) => (from === to ? seasonLabel(from) : `${seasonLabel(from)} – ${seasonLabel(to)}`))
        .join(' · ');
}

const formatDate = (date: Date) => date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

export default function PlayerCareerTab({ career, careerSyncedAt, matchboxSeasons, coverage }: PlayerCareerTabProps) {
    return (
        <div className="space-y-8">
            {/* Trayectoria completa (API-Football) */}
            <section className="space-y-3">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Route className="w-5 h-5 text-emerald-400" />
                    Trayectoria
                </h2>
                {!careerSyncedAt ? (
                    <p className="text-sm text-slate-400 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-5">
                        Su trayectoria completa todavía no se ha descargado. Se completa sola con el sync diario de datos,
                        empezando por los jugadores con más partidos.
                    </p>
                ) : career.length === 0 ? (
                    <p className="text-sm text-slate-400 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-5">
                        La fuente de datos no tiene registrada su trayectoria.
                    </p>
                ) : (
                    <ol className="relative bg-slate-900/60 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/80">
                        {career.map((entry) => {
                            const content = (
                                <>
                                    <TeamCrest name={entry.teamName} crestUrl={entry.teamLogo} size={32} />
                                    <span className="flex-1 min-w-0">
                                        <span className="block truncate text-sm font-bold text-white">{entry.teamName}</span>
                                        <span className="block text-xs text-slate-400">
                                            {entry.seasons.length > 0 ? formatSeasonRanges(entry.seasons) : 'Sin temporadas registradas'}
                                        </span>
                                    </span>
                                </>
                            );
                            return (
                                <li key={entry.teamApiId}>
                                    {entry.teamSlug ? (
                                        <Link href={`/teams/${entry.teamSlug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors">
                                            {content}
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 px-4 py-3">{content}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                )}
                <p className="text-[11px] text-slate-500">
                    Clubes y selecciones según API-Football, del más reciente al más antiguo. Incluye categorías inferiores y equipos filiales.
                </p>
            </section>

            {/* Lo que tenemos en Matchbox, temporada a temporada */}
            {matchboxSeasons.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-400" />
                        En la Champions, según Matchbox
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {matchboxSeasons.map((season) => (
                            <div key={season.season} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{season.season}</p>
                                {season.clubs.map((club) => (
                                    <Link key={club.slug} href={`/teams/${club.slug}`} className="flex items-center gap-2 text-sm font-semibold text-white hover:text-emerald-400 transition-colors">
                                        <TeamCrest name={club.name} crestUrl={club.crestUrl} size={20} />
                                        <span className="flex-1 truncate">{club.name}</span>
                                        <span className="text-xs text-slate-500 shrink-0">{club.matches} PJ</span>
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* De dónde salen los datos y de qué fechas son */}
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    Sobre estos datos
                </h2>
                <ul className="space-y-1.5 text-sm text-slate-300 list-disc pl-5">
                    {coverage.firstMatch && coverage.lastMatch ? (
                        <li>
                            Las estadísticas salen de <strong className="text-white">{coverage.matches} partidos de Champions League</strong>{' '}
                            jugados entre el {formatDate(coverage.firstMatch)} y el {formatDate(coverage.lastMatch)}
                            {coverage.seasons.length > 0 && <> (temporadas {coverage.seasons.join(', ')})</>}.
                        </li>
                    ) : (
                        <li>Todavía no hay partidos con el detalle de este jugador.</li>
                    )}
                    <li>Solo cuentan fase de grupos o de liga y eliminatorias; las rondas previas no se cargan.</li>
                    <li>Las notas y estadísticas por partido vienen de API-Football. Los votos al MVP son de la comunidad de Matchbox.</li>
                    {coverage.lastUpdated && <li>Última actualización de sus partidos: {formatDate(coverage.lastUpdated)}.</li>}
                    {careerSyncedAt && <li>Trayectoria descargada el {formatDate(careerSyncedAt)}.</li>}
                </ul>
            </section>
        </div>
    );
}
