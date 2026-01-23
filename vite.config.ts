import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

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
      ],
      define: {
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          'react': 'preact/compat',
          'react-dom/test-utils': 'preact/test-utils',
          'react-dom': 'preact/compat',     // Must be below test-utils
          'react/jsx-runtime': 'preact/jsx-runtime'
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'google-genai': ['@google/genai'],
              'markdown-libs': ['react-markdown', 'remark-gfm']
            }
          }
        }
      }
    };
});
