'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Download, Loader2, Trash2 } from 'lucide-react';
import { deleteAccount } from '@/app/actions/account';

export default function AccountDataSection({ username }: { username: string }) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const matches = confirmation.trim().toLowerCase() === username.toLowerCase();

    const handleDelete = () => {
        setError(null);
        startTransition(async () => {
            const res = await deleteAccount(confirmation);
            if (!res.success) {
                setError(res.error);
                return;
            }
            // La acción ya invalidó todo el layout: la barra de navegación vuelve a mostrar "Ingresar"
            router.push('/');
            router.refresh();
        });
    };

    return (
        <div className="space-y-6">
            {/* Tus datos */}
            <section className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-white">Tus datos</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Descarga en un archivo todo lo que Matchbox guarda de ti: perfil, reseñas, comentarios, votos, diario y Por Ver.
                        Más detalles en la <Link href="/privacidad" className="text-slate-300 underline underline-offset-2 hover:text-white">política de privacidad</Link>.
                    </p>
                </div>
                <a
                    href="/api/account/export"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm font-bold text-slate-200 hover:text-white hover:border-slate-700 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Descargar mis datos (JSON)
                </a>
            </section>

            {/* Zona de peligro */}
            <section className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        Eliminar cuenta
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Se borran para siempre tu perfil, tus reseñas (con sus likes y comentarios), tus comentarios, votos, diario y lista Por Ver.
                        No se puede deshacer. Si quieres conservar una copia, descarga tus datos antes.
                    </p>
                </div>

                {!confirming ? (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/40 text-sm font-bold text-rose-300 hover:bg-rose-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Quiero eliminar mi cuenta
                    </button>
                ) : (
                    <div className="space-y-3">
                        <label htmlFor="delete-confirmation" className="block text-sm text-slate-300">
                            Escribe <span className="font-mono font-bold text-white">{username}</span> para confirmar:
                        </label>
                        <input
                            id="delete-confirmation"
                            type="text"
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20"
                        />
                        {error && (
                            <p role="alert" className="text-sm text-rose-400">{error}</p>
                        )}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirming(false);
                                    setConfirmation('');
                                    setError(null);
                                }}
                                disabled={isPending}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={!matches || isPending}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-sm font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Eliminar mi cuenta para siempre
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
