import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { teamSearchText } from '@/lib/team-aliases';
import TeamsDirectory, { type DirectoryTeam } from '@/components/teams/TeamsDirectory';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Equipos | Matchbox',
    description: 'Todos los equipos de la Champions League en Matchbox: escudo, país y partidos registrados.',
};

export default async function TeamsPage() {
    const teams = await prisma.team.findMany({
        select: {
            id: true,
            name: true,
            shortName: true,
            slug: true,
            crestUrl: true,
            country: true,
            _count: { select: { homeMatches: true, awayMatches: true } },
        },
        orderBy: { name: 'asc' },
    });

    const directory: DirectoryTeam[] = teams
        .map((team) => ({
            id: team.id,
            name: team.name,
            slug: team.slug,
            crestUrl: team.crestUrl,
            country: team.country,
            matches: team._count.homeMatches + team._count.awayMatches,
            searchText: teamSearchText(team),
        }))
        // Equipos que solo aparecen en tablas o estadísticas, sin partidos guardados, no aportan una página útil
        .filter((team) => team.matches > 0);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28">
            <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Equipos</h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        {directory.length} clubes con partidos de Champions League en Matchbox.
                    </p>
                </div>
            </div>

            <TeamsDirectory teams={directory} />
        </div>
    );
}
