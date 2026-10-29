import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { CONTACT_URL } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
    title: 'Términos de uso | Matchbox',
    description: 'Las reglas para usar Matchbox y publicar reseñas y comentarios.',
};

export default function TermsPage() {
    return (
        <LegalPage
            title="Términos de uso"
            intro="Al usar Matchbox aceptas estas reglas. Están pensadas para que la comunidad hable de fútbol con pasión, pero con respeto."
        >
            <section>
                <h2>Qué es Matchbox</h2>
                <p>
                    Una aplicación de aficionados para calificar partidos, escribir reseñas, votar al MVP y llevar un diario de los partidos que ves.
                    Es un proyecto independiente: no está afiliado a la UEFA, a ningún club ni a API-Football.
                </p>
            </section>

            <section>
                <h2>Tu cuenta</h2>
                <ul>
                    <li>Entras con tu cuenta de Google y eres responsable de lo que se publique con ella.</li>
                    <li>Tu nombre de usuario no puede suplantar a otra persona ni contener lenguaje ofensivo.</li>
                    <li>Puedes eliminar tu cuenta cuando quieras desde <Link href="/settings/profile">Editar perfil</Link>.</li>
                </ul>
            </section>

            <section>
                <h2>Lo que publicas</h2>
                <ul>
                    <li>Eres el autor de tus reseñas y comentarios, y respondes por ellos.</li>
                    <li>Nos das permiso para mostrarlos en Matchbox mientras no los borres o elimines tu cuenta.</li>
                    <li>
                        No está permitido: insultos discriminatorios, amenazas, acoso, spam o publicidad, contenido ilegal ni revelar spoilers
                        sin marcarlos como tales.
                    </li>
                    <li>
                        Un filtro automático bloquea los textos con insultos graves o amenazas y envía a revisión los que tienen groserías.
                        También hay límites de cuántos comentarios y calificaciones se pueden enviar por minuto.
                    </li>
                    <li>
                        Cualquiera puede reportar contenido. Los moderadores pueden borrar lo que incumpla estas reglas y, en casos graves o repetidos,
                        suspender cuentas.
                    </li>
                </ul>
            </section>

            <section>
                <h2>Datos y marcas de terceros</h2>
                <p>
                    Los escudos, fotos de jugadores, nombres de competiciones y datos de los partidos pertenecen a sus respectivos dueños.
                    Las estadísticas provienen de API-Football y pueden contener errores u omisiones.
                </p>
            </section>

            <section>
                <h2>Disponibilidad</h2>
                <p>
                    Matchbox se ofrece tal como está, sin garantías de que funcione siempre ni de que los datos sean exactos.
                    Podemos cambiar o retirar funciones en cualquier momento.
                </p>
            </section>

            <section>
                <h2>Privacidad</h2>
                <p>
                    Cómo tratamos tus datos está explicado en la <Link href="/privacidad">política de privacidad</Link>.
                </p>
            </section>

            <section>
                <h2>Cambios y contacto</h2>
                <p>
                    Si cambiamos estos términos actualizaremos la fecha de arriba. Para cualquier duda, escríbenos por{' '}
                    <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">GitHub</a>.
                </p>
            </section>
        </LegalPage>
    );
}
