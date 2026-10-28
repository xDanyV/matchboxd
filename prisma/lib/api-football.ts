/**
 * Cliente de API-Football para los scripts de datos, pensado para el plan gratis:
 * 100 peticiones al día y 10 por minuto. Lleva la cuenta de lo que se gasta en la corrida
 * y se detiene ANTES de agotar la cuota (presupuesto) para dejar margen al resto del día.
 */

const API_BASE = 'https://v3.football.api-sports.io';
const RATE_LIMIT_WAIT_MS = 65_000;
const MAX_RATE_LIMIT_RETRIES = 2;

/** Se agotó la cuota diaria de la API (o queda menos que la reserva). */
export class QuotaError extends Error { }

/** Se gastó el presupuesto de esta corrida. No es un error: el resto queda para mañana. */
export class BudgetError extends Error { }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ApiClientOptions {
    apiKey: string;
    /** Máximo de peticiones en esta corrida */
    budget: number;
    /** Pausa mínima entre peticiones (10 por minuto -> 6 s; se usa 7 s de margen) */
    delayMs?: number;
    /** No usar las últimas N peticiones del día aunque quede presupuesto */
    reserve?: number;
}

export function createApiClient({ apiKey, budget, delayMs = 7000, reserve = 5 }: ApiClientOptions) {
    let used = 0;
    let lastRequestAt = 0;
    let remainingToday: number | null = null;

    async function get<T>(path: string, attempt = 0): Promise<T[]> {
        if (used >= budget) throw new BudgetError(`Presupuesto de ${budget} peticiones agotado.`);
        if (remainingToday !== null && remainingToday <= reserve) {
            throw new QuotaError(`Quedan ${remainingToday} peticiones hoy: se guardan como reserva.`);
        }

        const wait = lastRequestAt + delayMs - Date.now();
        if (wait > 0) await sleep(wait);
        lastRequestAt = Date.now();
        used += 1;

        const res = await fetch(`${API_BASE}${path}`, { headers: { 'x-apisports-key': apiKey } });

        const header = res.headers.get('x-ratelimit-requests-remaining');
        if (header !== null && Number.isFinite(Number(header))) remainingToday = Number(header);

        if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);

        // API-Football responde 200 incluso con errores (límite, plan, parámetros)
        const data = await res.json();
        const errors: unknown = data.errors;
        const errorKeys = errors && typeof errors === 'object' ? Object.keys(errors) : [];

        if (errorKeys.length > 0) {
            if (errorKeys.includes('rateLimit') && attempt < MAX_RATE_LIMIT_RETRIES) {
                console.warn(`  ⏳ Límite por minuto alcanzado. Esperando ${RATE_LIMIT_WAIT_MS / 1000}s...`);
                await sleep(RATE_LIMIT_WAIT_MS);
                return get<T>(path, attempt + 1);
            }
            if (errorKeys.includes('requests')) throw new QuotaError('Cuota diaria de la API agotada.');
            throw new Error(`La API devolvió errores en ${path}: ${JSON.stringify(errors)}`);
        }

        return (data.response ?? []) as T[];
    }

    return {
        get,
        get used() {
            return used;
        },
        get remainingToday() {
            return remainingToday;
        },
    };
}

export type ApiClient = ReturnType<typeof createApiClient>;
