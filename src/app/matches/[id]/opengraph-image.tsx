import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { getOgFonts } from '@/lib/og-fonts';
import { summarizeReviewTags, getReviewTag } from '@/lib/review-tags';

export const alt = 'Partido en Matchbox';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Tarjeta para compartir sin marcador: quien recibe el enlace puede no haber visto el partido
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const match = await prisma.match.findUnique({
        where: { id },
        select: {
            season: true,
            stage: true,
            competition: { select: { name: true } },
            homeTeam: { select: { name: true, crestUrl: true } },
            awayTeam: { select: { name: true, crestUrl: true } },
            reviews: { select: { rating: true, tags: true } },
        },
    });

    if (!match) {
        return new ImageResponse(
            (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#f8fafc', fontSize: 64, fontWeight: 900 }}>
                    Matchbox
                </div>
            ),
            { ...size, fonts: await getOgFonts() }
        );
    }

    const ratingsCount = match.reviews.length;
    const average = ratingsCount > 0 ? match.reviews.reduce((acc, r) => acc + r.rating, 0) / ratingsCount : null;
    // Las más votadas (puede haber empate), igual que en la cabecera del partido
    const leadingTagLabels = summarizeReviewTags(match.reviews)
        .leading.slice(0, 2)
        .map((slug) => getReviewTag(slug)?.label)
        .filter((label): label is string => Boolean(label));

    const team = (data: { name: string; crestUrl: string | null }) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: 380 }}>
            {data.crestUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.crestUrl} width={170} height={170} style={{ objectFit: 'contain' }} alt="" />
            ) : (
                <div style={{ width: 170, height: 170, borderRadius: 85, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, fontWeight: 900, color: '#34d399' }}>
                    {data.name.charAt(0)}
                </div>
            )}
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 900, color: '#f8fafc', textAlign: 'center', lineHeight: 1.1 }}>
                {data.name}
            </div>
        </div>
    );

    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #022c22 100%)', padding: '48px 64px', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, fontWeight: 700 }}>
                    <div style={{ display: 'flex', color: '#34d399', textTransform: 'uppercase', letterSpacing: 2 }}>
                        {[match.competition.name, match.stage, match.season].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ display: 'flex', fontSize: 30, fontWeight: 900, color: '#f8fafc' }}>Matchbox</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {team(match.homeTeam)}
                    <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: '#475569' }}>vs</div>
                    {team(match.awayTeam)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fbbf24', fontWeight: 900, fontSize: 40 }}>
                        {/* SVG en vez de "★": la fuente por defecto de ImageResponse no garantiza el glifo */}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="#fbbf24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {average !== null ? average.toFixed(1) : 'S/R'}
                        <span style={{ color: '#64748b', fontSize: 28, fontWeight: 600 }}>/ 10</span>
                    </div>
                    <div style={{ display: 'flex', color: '#94a3b8' }}>
                        {ratingsCount} {ratingsCount === 1 ? 'calificación' : 'calificaciones'}
                    </div>
                    {leadingTagLabels.map((label) => (
                        <div key={label} style={{ display: 'flex', padding: '6px 20px', borderRadius: 999, border: '2px solid #34d399', color: '#6ee7b7', fontWeight: 800 }}>
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size, fonts: await getOgFonts() }
    );
}
