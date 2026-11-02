'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Lleva la ventana al inicio cada vez que cambia la ruta.
 *
 * Next.js no lo garantiza: <Link> mantiene el scroll si considera que la página nueva ya es
 * visible, y para decidirlo se salta los elementos fijos o sticky (el modal de carga, la barra
 * flotante del marcador). En esos casos la página nueva aparecía a media altura.
 *
 * Solo actúa cuando cambia la ruta, no los parámetros (las pestañas de temporada o la paginación
 * siguen en su sitio), ni al ir atrás/adelante (el navegador restaura la posición) ni con un #ancla.
 */
export default function ScrollToTop() {
    const pathname = usePathname();
    const previous = useRef(pathname);
    const fromHistory = useRef(false);

    useEffect(() => {
        const onPopState = () => {
            fromHistory.current = true;
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    useEffect(() => {
        if (previous.current === pathname) return;
        previous.current = pathname;

        if (fromHistory.current) {
            fromHistory.current = false;
            return;
        }
        if (window.location.hash) return;

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);

    return null;
}
