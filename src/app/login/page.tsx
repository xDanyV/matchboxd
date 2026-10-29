import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AlertCircle, BookOpen, Sparkles, Star, Trophy } from 'lucide-react';
import { signIn } from '@/auth';
import { getSession } from '@/lib/session';
import { safeCallbackUrl } from '@/lib/login';

export const metadata: Metadata = {
    title: 'Iniciar sesión | Matchbox',
    robots: { index: false },
};

interface LoginPageProps {
    searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

// Códigos de error de Auth.js -> mensaje para el usuario
const ERROR_MESSAGES: Record<string, string> = {
    AccessDenied: 'Cancelaste el acceso o tu cuenta no tiene permiso para entrar.',
    OAuthAccountNotLinked: 'Ese correo ya está vinculado a otra forma de inicio de sesión.',
    Configuration: 'Hay un problema con la configuración del inicio de sesión. Inténtalo más tarde.',
    Verification: 'El enlace de acceso expiró o ya se usó.',
};
const DEFAULT_ERROR = 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.';

const FEATURES = [
    { icon: Star, title: 'Califica cada partido', text: 'Del 0.5 al 10 y con etiquetas como épico o remontada.' },
    { icon: BookOpen, title: 'Lleva tu diario', text: 'Registra lo que ves, dónde y cuántas veces.' },
    { icon: Sparkles, title: 'Vota al MVP', text: 'Elige a la figura del partido entre los que jugaron.' },
];

/** Sin callbackUrl explícito, vuelve a la página desde la que se llegó (solo si es de este sitio). */
async function resolveCallbackUrl(explicit: string | undefined) {
    if (explicit) return safeCallbackUrl(explicit);

    const headerList = await headers();
    const referer = headerList.get('referer');
    const host = headerList.get('host');
    if (!referer || !host) return '/';

    try {
        const url = new URL(referer);
        return url.host === host ? safeCallbackUrl(`${url.pathname}${url.search}`) : '/';
    } catch {
        return '/';
    }
}

function GoogleLogo() {
    return (
        <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
        </svg>
    );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const { callbackUrl, error } = await searchParams;
    const redirectTo = await resolveCallbackUrl(callbackUrl);

    // Quien ya tiene sesión no necesita esta página
    const session = await getSession();
    if (session?.user) redirect(redirectTo);

    const errorMessage = error ? ERROR_MESSAGES[error] ?? DEFAULT_ERROR : null;

    return (
        <div className="min-h-[calc(100svh-5rem)] flex items-center justify-center px-4 py-8 sm:py-12 pb-28">
            <div className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-900/60 shadow-2xl">
                {/* Panel visual: solo en pantallas medianas en adelante */}
                <div className="relative hidden md:flex flex-col justify-end min-h-[520px] p-10">
                    <Image
                        src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop"
                        alt=""
                        fill
                        sizes="(min-width: 768px) 50vw, 0px"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
                    <div className="relative space-y-6">
                        <h2 className="text-4xl font-black leading-tight tracking-tight text-white">El fútbol no se olvida</h2>
                        <ul className="space-y-4">
                            {FEATURES.map(({ icon: Icon, title, text }) => (
                                <li key={title} className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{title}</p>
                                        <p className="text-sm text-slate-300">{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Acceso */}
                <div className="flex flex-col justify-center p-6 sm:p-10 space-y-8">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Entra a Matchbox</h1>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Califica partidos, escribe reseñas y guarda los que quieres ver. Sin contraseñas: entras con tu cuenta de Google.
                            </p>
                        </div>
                    </div>

                    {errorMessage && (
                        <p role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{errorMessage}</span>
                        </p>
                    )}

                    <form
                        action={async () => {
                            'use server';
                            await signIn('google', { redirectTo });
                        }}
                    >
                        <button
                            type="submit"
                            className="w-full min-h-12 flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base shadow-lg transition-colors active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        >
                            <GoogleLogo />
                            Continuar con Google
                        </button>
                    </form>

                    {/* En móvil el panel visual se oculta: aquí va un resumen corto */}
                    <ul className="md:hidden grid gap-3">
                        {FEATURES.map(({ icon: Icon, title }) => (
                            <li key={title} className="flex items-center gap-2.5 text-sm text-slate-300">
                                <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                                {title}
                            </li>
                        ))}
                    </ul>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        Al continuar aceptas los{' '}
                        <Link href="/terminos" className="text-slate-400 underline underline-offset-2 hover:text-white">términos de uso</Link>{' '}
                        y la{' '}
                        <Link href="/privacidad" className="text-slate-400 underline underline-offset-2 hover:text-white">política de privacidad</Link>.
                        Solo usamos tu nombre, foto y correo de Google para crear tu perfil, y nunca publicamos tu correo.{' '}
                        <Link href="/" className="text-slate-400 underline underline-offset-2 hover:text-white">
                            Seguir explorando sin cuenta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
