import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

export const LEGAL_LAST_UPDATED = '29 de octubre de 2026';
export const CONTACT_URL = 'https://github.com/xDanyV/matchboxd/issues';

interface LegalPageProps {
    title: string;
    intro: string;
    children: ReactNode;
}

/** Diseño común de las páginas legales: texto largo y legible, con buen contraste y ancho de lectura. */
export default function LegalPage({ title, intro, children }: LegalPageProps) {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28">
            <header className="space-y-3 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{title}</h1>
                </div>
                <p className="text-sm text-slate-400">Última actualización: {LEGAL_LAST_UPDATED}</p>
                <p className="text-slate-300 leading-relaxed">{intro}</p>
            </header>

            <div className="pt-6 space-y-8 text-sm sm:text-base leading-relaxed text-slate-300 [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-white [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-emerald-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-emerald-300 [&_strong]:text-white">
                {children}
            </div>
        </div>
    );
}
