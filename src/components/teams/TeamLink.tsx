import Link from 'next/link';
import type { ReactNode } from 'react';

interface TeamLinkProps {
    slug: string;
    name: string;
    className?: string;
    children: ReactNode;
}

export default function TeamLink({ slug, name, className = '', children }: TeamLinkProps) {
    return (
        <Link
            href={`/teams/${slug}`}
            title={name}
            className={`relative z-10 pointer-events-auto ${className}`}
        >
            {children}
        </Link>
    );
}