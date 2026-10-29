'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { playerHref } from '@/lib/players';
import { Users, User, LayoutGrid, List, ChevronDown } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    photoUrl: string | null;
    position: string | null;
    number: number | null;
}

interface TeamSquadSectionProps {
    squadGroups: { label: string; key: string; players: Player[] }[];
}

const POSITION_TABS = [
    { key: 'ALL', label: 'Todos' },
    { key: 'Goalkeeper', label: 'Porteros' },
    { key: 'Defender', label: 'Defensas' },
    { key: 'Midfielder', label: 'Mediocampistas' },
    { key: 'Attacker', label: 'Delanteros' },
];

export default function TeamSquadSection({ squadGroups }: TeamSquadSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const allPlayers = squadGroups.flatMap((g) => g.players);
    const filteredPlayers = selectedPosition === 'ALL'
        ? allPlayers
        : allPlayers.filter((p) => p.position === selectedPosition);

    return (
        <section id="plantilla" className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 scroll-mt-24 backdrop-blur-md shadow-lg transition-all">
            {/* Botón de Cabecera Desplegable */}
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-3 text-left group focus:outline-none flex-1"
                >
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                                Plantilla actual
                            </h2>
                            <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full border border-slate-700/50">
                                {allPlayers.length} jugadores
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                            {isExpanded ? 'Haz clic para contraer el plantel.' : 'Haz clic para desplegar la lista de jugadores.'}
                        </p>
                    </div>
                </button>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Controles de Vista (Grid/List) visibles solo cuando está expandido */}
                    {isExpanded && (
                        <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                title="Vista de tarjetas"
                                className={`p-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                title="Vista de lista"
                                className={`p-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Botón con Flecha para Expandir/Contraer */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-label={isExpanded ? 'Contraer plantilla' : 'Expandir plantilla'}
                        className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95"
                    >
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Contenido Desplegable */}
            {isExpanded && (
                <div className="pt-4 border-t border-slate-800/80 space-y-5 animate-in fade-in duration-200">
                    {/* Filtros por Posición */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {POSITION_TABS.map((tab) => {
                            const isActive = selectedPosition === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setSelectedPosition(tab.key)}
                                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${isActive
                                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                            : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Lista/Cuadrícula de Jugadores */}
                    {filteredPlayers.length === 0 ? (
                        <div className="text-center py-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl">
                            <p className="text-slate-400 text-xs sm:text-sm">No hay jugadores registrados en esta posición.</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                            {filteredPlayers.map((player) => (
                                <Link
                                    key={player.id}
                                    href={playerHref(player.id)}
                                    className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-3.5 flex flex-col items-center text-center space-y-2.5 transition-all duration-200 shadow-sm group"
                                >
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700/80 group-hover:border-emerald-500/50 transition-colors flex items-center justify-center shrink-0">
                                        {player.photoUrl ? (
                                            <Image src={player.photoUrl} alt={player.name} fill sizes="64px" className="object-cover" />
                                        ) : (
                                            <User className="w-7 h-7 text-slate-500" />
                                        )}
                                    </div>

                                    <div className="min-w-0 w-full space-y-0.5">
                                        {player.number !== null && (
                                            <span className="inline-block bg-slate-900 border border-slate-800 text-emerald-400 text-[10px] font-mono font-black px-2 py-0.5 rounded-md">
                                                #{player.number}
                                            </span>
                                        )}
                                        <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                                            {player.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 capitalize">
                                            {player.position === 'Goalkeeper' ? 'Portero' : player.position === 'Defender' ? 'Defensa' : player.position === 'Midfielder' ? 'Mediocampista' : 'Delantero'}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {filteredPlayers.map((player) => (
                                <Link key={player.id} href={playerHref(player.id)} className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-2.5 transition-colors">
                                    {player.photoUrl ? (
                                        <Image src={player.photoUrl} alt={player.name} width={38} height={38} className="w-9.5 h-9.5 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0" />
                                    ) : (
                                        <div className="w-9.5 h-9.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                            <User className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-white truncate">{player.name}</p>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                            {player.number !== null && <span className="font-mono text-emerald-400 font-bold">#{player.number}</span>}
                                            <span>•</span>
                                            <span className="capitalize">{player.position || 'Jugador'}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}