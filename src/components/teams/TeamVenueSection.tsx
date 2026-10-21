import Image from 'next/image';

interface TeamVenueSectionProps {
    venueName: string | null;
    venueCity: string | null;
    country: string | null;
    venueCapacity: number | null;
    venueImageUrl: string | null;
}

export default function TeamVenueSection({
    venueName,
    venueCity,
    country,
    venueCapacity,
    venueImageUrl,
}: TeamVenueSectionProps) {
    if (!venueName) return null;

    const venueLocation = [venueCity, country].filter(Boolean).join(', ');
    const numberFormatter = new Intl.NumberFormat('es-MX');

    return (
        <section className="overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-5 backdrop-blur-md shadow-lg">
            {venueImageUrl && (
                <div className="relative sm:col-span-2 aspect-video sm:aspect-auto sm:min-h-44 bg-slate-800">
                    <Image
                        src={venueImageUrl}
                        alt={venueName}
                        fill
                        sizes="(min-width: 640px) 40vw, 100vw"
                        className="object-cover"
                    />
                </div>
            )}
            <div className={`p-6 sm:p-8 flex flex-col justify-center space-y-2 ${venueImageUrl ? 'sm:col-span-3' : 'sm:col-span-5'}`}>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Estadio</span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{venueName}</h2>
                <p className="text-sm text-slate-400">
                    {venueLocation}
                    {venueLocation && venueCapacity ? ' • ' : ''}
                    {venueCapacity ? `Capacidad: ${numberFormatter.format(venueCapacity)}` : ''}
                </p>
            </div>
        </section>
    );
}