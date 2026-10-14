import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({ input: ['resources/css/app.css', 'resources/js/app.tsx'], refresh: true }),
        react(),
        tailwindcss(),
    ],
    esbuild: { jsx: 'automatic' },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }

                    if (id.includes('react') || id.includes('scheduler')) {
                        return 'vendor-react';
                    }

                    if (id.includes('@inertiajs')) {
                        return 'vendor-inertia';
                    }

                    if (id.includes('lucide-react')) {
                        return 'vendor-icons';
                    }

                    return 'vendor';
                },
                entryFileNames: 'assets/[name]-[hash]-v3.js',
                chunkFileNames: 'assets/[name]-[hash]-v3.js',
                assetFileNames: 'assets/[name]-[hash]-v3[extname]',
            },
        },
    },
    server: { host: '0.0.0.0', watch: { ignored: ['**/storage/framework/views/**'] } },
});
