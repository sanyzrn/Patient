import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'data.js'],
      manifest: {
        name: 'آموزش و حمایت از بیمار | نفس زیست فارمد',
        short_name: 'نفس فارمد',
        description: 'پورتال جامع آموزش و حمایت از بیماران شامل کاتالوگ‌های آموزشی، بروشورهای دارویی و ویدئوهای آموزشی.',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#b61615',
        start_url: '.',
        display: 'standalone',
        background_color: '#f8fafc',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3003/3003296.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mjs,wasm}'],
        ignoreURLParametersMatching: [/^catalogId/, /^page/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|pdf)(?:\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist')) return 'pdf';
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
            if (id.includes('react-pageflip') || id.includes('page-flip')) return 'flipbook';
            if (id.includes('motion') || id.includes('framer')) return 'motion';
            if (id.includes('react-dom') || id.includes('scheduler') || id.includes('/react/')) return 'react-vendor';
          }
        },
      },
    },
  },
})