import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered for real in dev too (see main.tsx) — an offline-billing
      // feature that only activates in a production build is untestable
      // day-to-day and easy to silently regress.
      devOptions: { enabled: true, type: 'module' },
      workbox: {
        // App shell (JS/CSS/HTML) precached so the page itself still loads
        // offline, not just the data layer. Live data always goes through
        // the app's own Dexie cache (src/db/offlineDb.ts), not the SW cache.
        navigateFallback: '/index.html',
        // Without these, a freshly-installed SW doesn't take control until
        // the *second* navigation — so the very first offline reload after
        // install would still fail. A single-terminal POS app should be
        // offline-ready as soon as it's ever been opened once.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'PosPe POS',
        short_name: 'PosPe POS',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1976d2',
      },
    }),
  ],
});
