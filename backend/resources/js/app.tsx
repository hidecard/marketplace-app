import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Marketplace';

createInertiaApp({
    id: 'app',
    title: (title) => (title ? `${title} · ${appName}` : appName),
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')) as any,
    setup({ el, App, props }) {
        if (!el) return;
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#2563eb' },
});
