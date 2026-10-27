import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { getOgFonts } from '@/lib/og-fonts';
import { getUserStats } from '@/lib/user-stats';

export const alt = 'Perfil en Matchbox';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;

    const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { id: true, name: true, username: true, image: true },
    });

    const displayName = user?.name ?? user?.username ?? 'Matchbox';
    const stats = user ? await getUserStats(user.id) : null;

    const tiles = stats
        ? [
            { label: 'Vistos', value: String(stats.matchesWatched) },
            { label: 'En el estadio', value: String(stats.stadiumVisits) },
            { label: 'Nota media', value: stats.averageRating !== null ? stats.averageRating.toFixed(1) : '—' },
            { label: 'Reseñas', value: String(stats.writtenReviews) },
        ]
        : [];

    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #022c22 100%)', padding: '56px 64px', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 30, fontWeight: 900, color: '#f8fafc' }}>
                    Matchbox
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                    {user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} width={180} height={180} style={{ borderRadius: 90, border: '4px solid #34d399' }} alt="" />
                    ) : (
                        <div style={{ width: 180, height: 180, borderRadius: 90, background: '#064e3b', border: '4px solid #34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, fontWeight: 900, color: '#34d399' }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, color: '#f8fafc' }}>{displayName}</div>
                        {user?.username && (
                            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: '#34d399' }}>@{user.username}</div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 20 }}>
                    {tiles.map((tile) => (
                        <div key={tile.label} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6, padding: '20px 24px', borderRadius: 24, background: 'rgba(15, 23, 42, 0.8)', border: '2px solid #1e293b' }}>
                            <div style={{ display: 'flex', fontSize: 52, fontWeight: 900, color: '#f8fafc' }}>{tile.value}</div>
                            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
                                {tile.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size, fonts: await getOgFonts() }
    );
}
