import 'next-auth';
import type { UserRole } from '@prisma/client';

declare module 'next-auth' {
    interface User {
        username?: string | null;
        role?: UserRole;
    }
}

export {};
