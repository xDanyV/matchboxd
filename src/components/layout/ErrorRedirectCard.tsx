'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorRedirectCardProps {
    title?: string;
    message?: string;
    redirectSeconds?: number;
}

export default function ErrorRedirectCard({
    title = 'Ha ocurrido un error inesperado',
    message = 'Te estamos redirigiendo automáticamente a la página de inicio por seguridad.',
    redirectSeconds = 5,
}: ErrorRedirectCardProps) {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/');
        }, redirectSeconds * 1000);

        return () => clearTimeout(timer);
    }, [router, redirectSeconds]);

    return (
        <div className="min-h-[75vh] flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="max-w-md w-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6"
            >
                {/* Icono de advertencia animado */}
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                    <AlertTriangle className="w-8 h-8 animate-pulse" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {title}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <Home className="w-4 h-4" />
                        <span>Ir al inicio ahora</span>
                    </button>
                </div>

                <p className="text-[11px] text-slate-500">
                    Redirección automática en {redirectSeconds} segundos...
                </p>
            </motion.div>
        </div>
    );
}