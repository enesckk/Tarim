import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const tarimAiTarget = env.VITE_TARIM_AI_PROXY_TARGET || 'http://127.0.0.1:4000'

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
      },
    },
    preview: {
      proxy: {
        '/tarim-ai-api': {
          target: tarimAiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/tarim-ai-api/, ''),
        },
      },
    },
  }
})
