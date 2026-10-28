'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Flag, Loader2, X } from 'lucide-react';
import type { ReportReason } from '@prisma/client';
import { reportContent } from '@/app/actions/moderation';
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS } from '@/lib/moderation';

interface ReportDialogProps {
    target: { reviewId: string } | { commentId: string };
    onClose: () => void;
}

export default function ReportDialog({ target, onClose }: ReportDialogProps) {
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [isPending, startTransition] = useTransition();

    const kindLabel = 'reviewId' in target ? 'reseña' : 'comentario';
    const kindWithArticle = 'reviewId' in target ? 'esta reseña' : 'este comentario';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;
        setError(null);

        startTransition(async () => {
            const res = await reportContent({ ...target, reason, details });
            if (res.success) {
                setSent(true);
            } else {
                setError(res.error);
            }
        });
    };

    // Portal: las tarjetas usan backdrop-blur, que convierte al ancestro en el contenedor de los
    // elementos `fixed` y dejaba el diálogo recortado dentro de la tarjeta en vez de cubrir la pantalla
    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            <Flag className="w-4 h-4" />
                        </div>
                        <h3 id="report-title" className="text-base sm:text-lg font-black text-white">
                            Reportar {kindLabel}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {sent ? (
                    <div className="space-y-4 text-center py-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                        <p className="text-sm text-slate-300">
                            Gracias. Un moderador revisará {kindWithArticle}.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-slate-800 text-sm font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <fieldset className="space-y-2">
                            <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Motivo</legend>
                            {REPORT_REASONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${reason === option.value
                                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="report-reason"
                                        value={option.value}
                                        checked={reason === option.value}
                                        onChange={() => setReason(option.value)}
                                        className="accent-rose-500"
                                    />
                                    <span className="text-sm font-semibold">{option.label}</span>
                                </label>
                            ))}
                        </fieldset>

                        <div className="space-y-1.5">
                            <label htmlFor="report-details" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Detalles (opcional)
                            </label>
                            <textarea
                                id="report-details"
                                rows={3}
                                maxLength={REPORT_DETAILS_MAX_LENGTH}
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Cuéntanos qué pasa para ayudar al moderador…"
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 transition-colors resize-none"
                            />
                        </div>

                        {error && (
                            <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </p>
                        )}

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={!reason || isPending}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Enviar reporte
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
