/**
 * A dónde volver después de iniciar sesión. Solo se aceptan rutas internas ("/matches/123"):
 * una URL externa en callbackUrl convertiría el login en un redirector hacia sitios maliciosos.
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
    if (!raw) return '/';
    // "//dominio" y "/\dominio" los navegadores los tratan como otra web
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
    if (raw === '/login' || raw.startsWith('/login?')) return '/';
    return raw;
}

export function loginHref(callbackUrl?: string | null): string {
    const target = safeCallbackUrl(callbackUrl);
    return target === '/' ? '/login' : `/login?callbackUrl=${encodeURIComponent(target)}`;
}
