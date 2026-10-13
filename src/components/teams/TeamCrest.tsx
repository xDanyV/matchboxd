import Image from 'next/image';

interface TeamCrestProps {
    name: string;
    crestUrl?: string | null;
    size?: number;
    className?: string;
}

export default function TeamCrest({ name, crestUrl, size = 40, className = '' }: TeamCrestProps) {
    const box = { width: size, height: size };

    if (!crestUrl) {
        return (
            <div
                style={box}
                className={`rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 shrink-0 ${className}`}
            >
                {name.charAt(0)}
            </div>
        );
    }

    return (
        <div style={box} className={`relative shrink-0 ${className}`}>
            <Image
                src={crestUrl}
                alt={name}
                fill
                sizes={`${size}px`}
                className="object-contain"
            />
        </div>
    );
}