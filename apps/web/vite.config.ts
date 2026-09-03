import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

const base = process.env.GITHUB_PAGES === 'true' ? '/AbelProcure/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AbelProcure — PC Parts Deal Intelligence',
        short_name: 'AbelProcure',
        description: 'eBay UK PC parts procurement, auction tracking and deal scoring.',
        theme_color: '#0b0f16',
        background_color: '#0b0f16',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@abelprocure/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
