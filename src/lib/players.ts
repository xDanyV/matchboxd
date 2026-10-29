// Los jugadores se guardan con id "api-player-<id de API-Football>"; en la URL va solo el número
const PREFIX = 'api-player-';

export function playerHref(playerId: string): string {
    return `/players/${playerId.startsWith(PREFIX) ? playerId.slice(PREFIX.length) : playerId}`;
}

/** Parámetro de la URL -> id en la base de datos. Solo acepta números (o un id ya completo). */
export function playerIdFromParam(param: string): string | null {
    if (/^\d{1,10}$/.test(param)) return `${PREFIX}${param}`;
    if (param.startsWith(PREFIX)) return param;
    return null;
}

// La plantilla usa nombres en inglés y las alineaciones, letras
const POSITION_NAMES: Record<string, string> = {
    G: 'Portero',
    D: 'Defensa',
    M: 'Mediocampista',
    F: 'Delantero',
    Goalkeeper: 'Portero',
    Defender: 'Defensa',
    Midfielder: 'Mediocampista',
    Attacker: 'Delantero',
};

export function positionLabel(position: string | null | undefined): string | null {
    return position ? POSITION_NAMES[position] ?? position : null;
}
