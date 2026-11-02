import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pruebas de la lógica pura (src/lib): sin base de datos ni navegador
export default defineConfig({
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
