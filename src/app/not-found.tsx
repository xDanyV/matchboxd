import ErrorRedirectCard from '@/components/layout/ErrorRedirectCard';

export default function NotFound() {
    return (
        <ErrorRedirectCard
            title="Página o recurso no encontrado"
            message="El partido, equipo o usuario que intentas consultar no existe o fue movido."
            redirectSeconds={5}
        />
    );
}