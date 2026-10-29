import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { playerHref } from '@/lib/players';
import { siteUrl } from '@/lib/site';

// Se regenera una vez al día: el sync diario agrega partidos y jugadores
export const revalidate = 86400;

/**
 * Páginas públicas para los buscadores. No se incluyen los perfiles de usuario
 * (son de las personas, no contenido del sitio) ni las páginas privadas.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = siteUrl();

    const [competitions, teams, matches, players] = await Promise.all([
        prisma.competition.findMany({ select: { slug: true, seasons: { where: { standingsSyncedAt: { not: null } }, select: { season: true } } } }),
        prisma.team.findMany({ select: { slug: true } }),
        prisma.match.findMany({ select: { id: true, updatedAt: true, detailsSyncedAt: true } }),
        // Solo jugadores con partidos registrados: los demás tendrían una página vacía
        prisma.player.findMany({ where: { matchStats: { some: {} } }, select: { id: true } }),
    ]);

    const staticPages: MetadataRoute.Sitemap = [
        { url: base, changeFrequency: 'daily', priority: 1 },
        { url: `${base}/matches`, changeFrequency: 'daily', priority: 0.8 },
        { url: `${base}/teams`, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${base}/privacidad`, changeFrequency: 'yearly', priority: 0.1 },
        { url: `${base}/terminos`, changeFrequency: 'yearly', priority: 0.1 },
    ];

    return [
        ...staticPages,
        ...competitions.flatMap((competition) => [
            { url: `${base}/competitions/${competition.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 },
            ...competition.seasons.map((s) => ({
                url: `${base}/competitions/${competition.slug}?season=${s.season}`,
                changeFrequency: 'monthly' as const,
                priority: 0.6,
            })),
        ]),
        ...teams.map((team) => ({ url: `${base}/teams/${team.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
        ...matches.map((match) => ({
            url: `${base}/matches/${match.id}`,
            lastModified: match.detailsSyncedAt ?? match.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })),
        ...players.map((player) => ({ url: `${base}${playerHref(player.id)}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
    ];
}
