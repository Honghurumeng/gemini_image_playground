import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3003,
        host: '0.0.0.0',
      },
      plugins: [
        preact(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['logo.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
          devOptions: {
            enabled: true
          },
          // 禁用 Google Analytics
          workbox: {
            offlineGoogleAnalytics: false
          },
          manifest: {
            name: 'UndyDraw',
            short_name: 'UndyDraw',
            description: 'Gemini 3 Pro 客户端',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        }),
      ],
      define: {
        // 注入开发环境版本信息
        __APP_VERSION__: JSON.stringify(mode === 'production' ? 'build-time-version' : 'dev-' + Date.now())
      },
      // 构建配置
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'google-genai': ['@google/genai'],
              'markdown-libs': ['react-markdown', 'remark-gfm']
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          'react': 'preact/compat',
          'react-dom/test-utils': 'preact/test-utils',
          'react-dom': 'preact/compat',     // Must be below test-utils
          'react/jsx-runtime': 'preact/jsx-runtime'
        }
      }
    };
});
