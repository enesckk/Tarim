import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const tarimAiTarget = env.VITE_TARIM_AI_PROXY_TARGET || 'http://127.0.0.1:4000'

  return {
    plugins: [react(), tailwindcss()],
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
