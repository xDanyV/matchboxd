'use client';

import { Loader2, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingModalProps {
    message?: string;
}

export default function LoadingModal({ message = 'Cargando contenido...' }: LoadingModalProps) {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -15 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-slate-900/90 border border-slate-800/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center space-y-4 max-w-xs sm:max-w-sm w-full text-center border-emerald-500/10"
            >
                {/* Icono central de Matchbox animado */}
                <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                        <Trophy className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-lg -z-10 animate-pulse" />
                </div>

                {/* Círculo de Carga y Mensaje */}
                <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-black tracking-tight text-white">MATCHBOX</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                        {message}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}