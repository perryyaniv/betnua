import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'בתנועה - ניהול סטודיו',
        short_name: 'בתנועה',
        description: 'ניהול סניפים, מורים, חוגים ואירועים לסטודיו בתנועה',
        theme_color: '#9c5389',
        background_color: '#FAF7F8',
        display: 'standalone',
        dir: 'rtl',
        lang: 'he',
        start_url: '/',
        icons: [
          { src: 'logo.png', sizes: '233x170', type: 'image/png', purpose: 'any' },
          { src: 'logo.png', sizes: '233x170', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
    },
  },
});
