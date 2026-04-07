import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/lib/**', 'src/connectors/**'],
            exclude: ['src/lib/entityDemoContent.ts', 'src/lib/entityDatasets.ts', 'src/lib/entityContext.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
