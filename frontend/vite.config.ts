import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const tarimAiTarget = (env.VITE_TARIM_AI_PROXY_TARGET || 'http://127.0.0.1:4000').replace('localhost', '127.0.0.1')

  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Tarım Yönetim',
          short_name: 'Tarım',
          description: 'Tarım yönetim ve takip sistemi',
          theme_color: '#ffffff',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'next/image': path.resolve(__dirname, './src/shims/next/image.tsx'),
        'gsap/ScrollTrigger': path.resolve(__dirname, './src/shims/gsap-scroll-trigger.ts'),
        'gsap': path.resolve(__dirname, './src/shims/gsap.ts'),
        'lenis': path.resolve(__dirname, './src/shims/lenis.ts'),
        '@lenis/react': path.resolve(__dirname, './src/shims/lenis.ts'),
      },
    },
    server: {
      proxy: {
        // Prefix must NOT be `/tarim-ai` — that is the React Router page path.
        '/tarim-ai-api': {
          target: tarimAiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/tarim-ai-api/, ''),
        },
        '/api': {
          target: tarimAiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        '/tarim-ai-api': {
          target: tarimAiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/tarim-ai-api/, ''),
        },
        '/api': {
          target: tarimAiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
