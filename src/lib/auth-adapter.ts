import type { PrismaClient } from '@prisma/client';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';

/**
 * Quita los tokens de Google de la cuenta antes de guardarla. Matchbox solo necesita saber
 * QUÉ cuenta de Google es (provider + providerAccountId) para iniciar sesión; nunca llama a
 * las APIs de Google, así que guardar access_token / id_token solo sería un riesgo si la base
 * de datos se filtrara.
 */
export function stripTokens(account: AdapterAccount): AdapterAccount {
    return {
        ...account,
        access_token: undefined,
        refresh_token: undefined,
        id_token: undefined,
        session_state: undefined,
    };
}

export function createAuthAdapter(prisma: PrismaClient): Adapter {
    const base = PrismaAdapter(prisma);
    // La cuenta se escribe una sola vez (al vincularla); en los siguientes inicios de sesión no se toca
    return { ...base, linkAccount: (account) => base.linkAccount!(stripTokens(account)) };
}
