import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { CONTACT_URL } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
    title: 'Política de privacidad | Matchbox',
    description: 'Qué datos guarda Matchbox, para qué los usa y cómo descargarlos o eliminarlos.',
};

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Política de privacidad"
            intro="Matchbox es un proyecto independiente de aficionados al fútbol. Esta página explica qué datos guardamos, para qué y qué control tienes sobre ellos. Guardamos solo lo necesario para que la app funcione."
        >
            <section>
                <h2>Qué datos guardamos</h2>
                <ul>
                    <li>
                        <strong>De tu cuenta de Google:</strong> tu nombre, correo electrónico, foto de perfil y el identificador de tu cuenta.
                        No guardamos contraseñas ni los tokens de acceso de Google: solo necesitamos saber qué cuenta eres para iniciar sesión.
                    </li>
                    <li>
                        <strong>Lo que tú creas:</strong> nombre de usuario, bio y equipo favorito; calificaciones, reseñas, etiquetas, comentarios,
                        likes, votos al MVP, tu diario de partidos, tu lista Por Ver y los reportes que envíes.
                    </li>
                    <li>
                        <strong>Datos técnicos mínimos:</strong> una sesión para mantenerte conectado y las fechas en que creas o editas contenido.
                    </li>
                </ul>
            </section>

            <section>
                <h2>Para qué los usamos</h2>
                <ul>
                    <li>Iniciar sesión y mantener tu sesión abierta.</li>
                    <li>Mostrar tu perfil, tus reseñas, tu diario y tus estadísticas.</li>
                    <li>Calcular las calificaciones y el MVP de la comunidad.</li>
                    <li>
                        Moderar: un filtro automático revisa el texto de reseñas, comentarios, nombres de usuario y bios para detectar insultos
                        discriminatorios, amenazas y groserías. Los moderadores pueden revisar el contenido reportado.
                    </li>
                    <li>Evitar abusos: limitamos cuántos comentarios, calificaciones y reportes se pueden enviar por minuto.</li>
                </ul>
                <p className="mt-3">No vendemos tus datos, no los usamos para publicidad y no hacemos perfiles comerciales.</p>
            </section>

            <section>
                <h2>Qué es público</h2>
                <ul>
                    <li>Tu perfil (nombre, foto, nombre de usuario, bio y equipo favorito), tus reseñas, comentarios, diario y estadísticas.</li>
                    <li>Tu <strong>correo electrónico nunca se muestra</strong> a otros usuarios.</li>
                    <li>Tus votos al MVP cuentan en los resultados del partido, pero no se muestra quién votó por quién.</li>
                </ul>
            </section>

            <section>
                <h2>Con quién se comparten</h2>
                <p>Solo con los servicios que hacen funcionar Matchbox, y únicamente para eso:</p>
                <ul className="mt-2">
                    <li><strong>Google</strong>, para el inicio de sesión.</li>
                    <li>El proveedor de <strong>base de datos</strong> (Neon) y el de <strong>alojamiento web</strong>, que almacenan y sirven la aplicación.</li>
                </ul>
                <p className="mt-3">Los datos de partidos vienen de API-Football; no le enviamos ningún dato tuyo.</p>
            </section>

            <section>
                <h2>Cookies</h2>
                <p>
                    Usamos solo las cookies necesarias para el inicio de sesión y para mantener tu sesión. No usamos cookies de analítica ni de publicidad.
                </p>
            </section>

            <section>
                <h2>Cuánto tiempo los guardamos</h2>
                <p>
                    Mientras tengas tu cuenta. Si la eliminas, se borran tu perfil y todo lo que creaste: reseñas (con sus likes y comentarios),
                    comentarios, votos, diario, Por Ver, reportes y sesiones.
                </p>
            </section>

            <section>
                <h2>Tus derechos</h2>
                <ul>
                    <li><strong>Ver y descargar tus datos:</strong> en <Link href="/settings/profile">Editar perfil → Descargar mis datos</Link> obtienes un archivo con todo.</li>
                    <li><strong>Corregirlos:</strong> puedes editar tu perfil y tus reseñas en cualquier momento.</li>
                    <li><strong>Eliminarlos:</strong> en <Link href="/settings/profile">Editar perfil → Eliminar cuenta</Link>, sin pasos extra.</li>
                    <li>
                        <strong>Oponerte o hacer cualquier consulta:</strong> escríbenos por <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">GitHub</a>.
                    </li>
                </ul>
            </section>

            <section>
                <h2>Edad mínima</h2>
                <p>Para crear una cuenta debes tener al menos 13 años, o la edad mínima que exija la ley de tu país.</p>
            </section>

            <section>
                <h2>Cambios en esta política</h2>
                <p>Si cambiamos algo importante, actualizaremos la fecha de arriba y lo avisaremos en la app.</p>
            </section>
        </LegalPage>
    );
}
