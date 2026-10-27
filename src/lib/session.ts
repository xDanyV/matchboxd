import { cache } from 'react';
import { auth } from '@/auth';

/**
 * Sesión del usuario memoizada por petición. Navbar, página y helpers la piden por separado;
 * con `auth()` directo cada llamada consultaba la base de datos (sesiones en BD).
 * Solo para componentes de servidor: las server actions siguen usando `auth()`.
 */
export const getSession = cache(() => auth());
