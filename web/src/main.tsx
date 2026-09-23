import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initAnalytics } from './services/analytics';
import './index.css';

// Recover from a stale PWA shell that still references an old hashed chunk.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const reloadKey = 'marketplace-pwa-reloaded';
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    }
  });
  window.addEventListener('load', () => {
    sessionStorage.removeItem('marketplace-pwa-reloaded');
  });
}

initAnalytics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
