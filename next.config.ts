import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
// Solo con HTTPS: en local (http://localhost) forzaría a pedir todo por https y la app no cargaría
const isHttps = (process.env.SITE_URL ?? '').startsWith('https://');

// Imágenes externas que se pueden mostrar (además de las que pasan por /_next/image)
const IMAGE_HOSTS = 'https://media.api-sports.io https://lh3.googleusercontent.com https://images.unsplash.com';

/**
 * Content Security Policy sin nonces (guía "Without Nonces" de Next 16). Bloquea scripts y
 * conexiones a otros dominios, que la página se incruste en otras webs y formularios que
 * envíen datos fuera. 'unsafe-inline' en scripts lo necesita Next sin nonces.
 * form-action incluye a Google porque el inicio de sesión redirige ahí tras enviar el formulario.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${IMAGE_HOSTS}`,
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  ...(isHttps ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // Para navegadores que no entienden frame-ancestors
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Otras webs solo ven el dominio de donde vienes, nunca la ruta (que puede incluir tu usuario)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  // Los navegadores ignoran HSTS si no llega por HTTPS, así que en local no afecta
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
