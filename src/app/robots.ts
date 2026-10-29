import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
    const base = siteUrl();
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // Páginas personales, de cuenta o sin valor para un buscador
            disallow: ['/api/', '/admin/', '/settings/', '/login', '/profile', '/reviews', '/watchlist'],
        },
        sitemap: `${base}/sitemap.xml`,
        host: base,
    };
}
