import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        ssr: true,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'ViteHmrTcHmi',
            fileName: 'index',
            formats: ['es']
        },
        rollupOptions: {
            external: [
                'vite',
            ],
            output: {
                globals: {
                    vite: 'Vite'
                }
            }
        },
        minify: true
    }
});