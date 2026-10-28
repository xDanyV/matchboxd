import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Bot, Flag, ShieldCheck } from 'lucide-react';
import type { ReportReason } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getReportReasonLabel } from '@/lib/moderation';
import ReportResolution from '@/components/moderation/ReportResolution';

export const metadata: Metadata = { title: 'Moderación | Matchbox', robots: { index: false } };

const userSelect = { select: { name: true, username: true } } as const;
const matchSelect = { select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } } } as const;

interface ReportGroup {
    key: string;
    target: { reviewId: string } | { commentId: string };
    kind: 'Reseña' | 'Comentario';
    content: string;
    author: { name: string | null; username: string | null };
    match: { id: string; homeTeam: { name: string }; awayTeam: { name: string } };
    reasons: Map<ReportReason, number>;
    entries: { id: string; reason: ReportReason; details: string | null; reporter: string | null; automatic: boolean; createdAt: Date }[];
}

export default async function AdminReportsPage() {
    const session = await getSession();

    // 404 en lugar de 403: a quien no es admin ni siquiera se le confirma que la página existe
    if (session?.user?.role !== 'ADMIN') notFound();

    const reports = await prisma.report.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
            reporter: userSelect,
            review: { include: { user: userSelect, match: matchSelect } },
            comment: { include: { user: userSelect, review: { select: { match: matchSelect } } } },
        },
    });

    // Un contenido puede acumular varios reportes: se agrupan para decidir una sola vez
    const groups = new Map<string, ReportGroup>();
    for (const report of reports) {
        const key = report.reviewId ? `review:${report.reviewId}` : `comment:${report.commentId}`;
        let group = groups.get(key);

        if (!group) {
            if (report.review) {
                group = {
                    key,
                    target: { reviewId: report.review.id },
                    kind: 'Reseña',
                    content: [report.review.title, report.review.content].filter(Boolean).join(' — ') || `Calificación de ${report.review.rating}/10 sin texto`,
                    author: report.review.user,
                    match: report.review.match,
                    reasons: new Map(),
                    entries: [],
                };
            } else if (report.comment) {
                group = {
                    key,
                    target: { commentId: report.comment.id },
                    kind: 'Comentario',
                    content: report.comment.content,
                    author: report.comment.user,
                    match: report.comment.review.match,
                    reasons: new Map(),
                    entries: [],
                };
            } else {
                continue;
            }
            groups.set(key, group);
        }

        group.reasons.set(report.reason, (group.reasons.get(report.reason) ?? 0) + 1);
        group.entries.push({
            id: report.id,
            reason: report.reason,
            details: report.details,
            reporter: report.reporter ? report.reporter.username ?? report.reporter.name ?? 'Usuario' : null,
            automatic: report.automatic,
            createdAt: report.createdAt,
        });
    }

    // Lo más reportado primero
    const ordered = [...groups.values()].sort((a, b) => b.entries.length - a.entries.length);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-28">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Moderación</h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                            Reportes pendientes de la comunidad, agrupados por contenido.
                        </p>
                    </div>
                </div>
                <span className="self-start sm:self-center inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 text-amber-300 text-xs sm:text-sm px-4 py-2 rounded-2xl font-bold">
                    <Flag className="w-3.5 h-3.5" />
                    {ordered.length} {ordered.length === 1 ? 'contenido reportado' : 'contenidos reportados'}
                </span>
            </div>

            {ordered.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-800/80 rounded-3xl space-y-2">
                    <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-base font-bold text-slate-200">No hay reportes pendientes</p>
                    <p className="text-xs sm:text-sm text-slate-500">Todo en orden por ahora.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {ordered.map((group) => (
                        <article key={group.key} className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-slate-200">
                                        {group.kind}
                                    </span>
                                    <span className="text-slate-400">
                                        de{' '}
                                        {group.author.username ? (
                                            <Link href={`/u/${group.author.username}`} className="font-bold text-slate-200 hover:text-emerald-400">
                                                @{group.author.username}
                                            </Link>
                                        ) : (
                                            <span className="font-bold text-slate-200">{group.author.name ?? 'Usuario'}</span>
                                        )}
                                    </span>
                                </div>
                                <Link
                                    href={`/matches/${group.match.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
                                >
                                    {group.match.homeTeam.name} vs {group.match.awayTeam.name}
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>

                            <blockquote className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 border-l-2 border-amber-500/60 rounded-r-xl px-4 py-3 whitespace-pre-line break-words">
                                {group.content}
                            </blockquote>

                            <div className="flex flex-wrap gap-1.5">
                                {[...group.reasons.entries()].map(([reason, count]) => (
                                    <span key={reason} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300">
                                        {getReportReasonLabel(reason)} · {count}
                                    </span>
                                ))}
                            </div>

                            <ul className="space-y-1.5 text-xs text-slate-400">
                                {group.entries.map((entry) => (
                                    <li key={entry.id} className="break-words">
                                        {entry.automatic ? (
                                            <span className="inline-flex items-center gap-1 font-semibold text-sky-300">
                                                <Bot className="w-3.5 h-3.5" />
                                                Filtro automático
                                            </span>
                                        ) : (
                                            <span className="font-semibold text-slate-300">@{entry.reporter}</span>
                                        )}
                                        {' · '}
                                        {entry.createdAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                        {entry.details && <span className="text-slate-500"> — “{entry.details}”</span>}
                                    </li>
                                ))}
                            </ul>

                            <div className="pt-3 border-t border-slate-800/60">
                                <ReportResolution target={group.target} />
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
