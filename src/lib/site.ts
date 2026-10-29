/** URL pública del sitio (sin barra final). En local cae en localhost. */
export function siteUrl(): string {
    return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}
