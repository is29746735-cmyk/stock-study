import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Vercel 주소의 맨 위(/)에서 열린다.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '주식 공부',
        short_name: '주식 공부',
        description: '주식 공부를 기록하고 돌아보는 나만의 앱',
        lang: 'ko',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#EEF2F1',
        theme_color: '#EEF2F1',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // 한글 글꼴은 조각이 많아서, 화면에 쓰인 조각만 받아 두고 다음부터 재사용한다.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 300 } },
          },
        ],
      },
    }),
  ],
})
