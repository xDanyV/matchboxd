import type { ReportReason } from '@prisma/client';

// Catálogo compartido por cliente y servidor (no importa Prisma en tiempo de ejecución)
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
    { value: 'SPAM', label: 'Spam o publicidad' },
    { value: 'OFFENSIVE', label: 'Ofensivo o acoso' },
    { value: 'UNMARKED_SPOILER', label: 'Spoiler sin marcar' },
    { value: 'OTHER', label: 'Otro motivo' },
];

export const REPORT_DETAILS_MAX_LENGTH = 300;

export function isReportReason(value: unknown): value is ReportReason {
    return REPORT_REASONS.some((reason) => reason.value === value);
}

export function getReportReasonLabel(value: ReportReason): string {
    return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}
