import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const tarimAiTarget = (
    env.VITE_TARIM_AI_PROXY_TARGET || "http://127.0.0.1:4000"
  ).replace("localhost", "127.0.0.1");
  const apiTarget = (
    env.VITE_API_PROXY_TARGET || "http://127.0.0.1:5109"
  ).replace("localhost", "127.0.0.1");

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        includeAssets: [
          "favicon.svg",
          "pwa-192x192.png",
          "pwa-512x512.png",
          "pwa-maskable-512x512.png",
          "apple-touch-icon.png",
          "push-sw.js",
        ],
        devOptions: { enabled: true, type: "module" },
        manifest: {
          id: "/",
          name: "Tarım Yönetim Sistemi",
          short_name: "Tarım",
          description:
            "Tarımsal üretim, arazi, görev ve analiz yönetim sistemi",
          lang: "tr-TR",
          dir: "ltr",
          start_url: "/producer",
          scope: "/",
          display: "standalone",
          display_override: [
            "window-controls-overlay",
            "standalone",
            "minimal-ui",
          ],
          orientation: "portrait",
          theme_color: "#1b5e20",
          background_color: "#f4f7f3",
          categories: ["business", "productivity", "utilities"],
          shortcuts: [
            {
              name: "Görevlerim",
              short_name: "Görevler",
              url: "/producer/tasks",
              icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
            },
            {
              name: "Uzmana sor",
              short_name: "Sohbet",
              url: "/producer/messages",
              icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
            },
          ],
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          importScripts: ["/push-sw.js"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [
            /^\/api(?:\/|$)/,
            /^\/tarim-ai-api(?:\/|$)/,
            /^\/hubs(?:\/|$)/,
          ],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          globIgnores: [
            "chapters/**",
            "images/**",
            "logo/**",
            "drone_photos/**",
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\//i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-font-stylesheets",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\//i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-font-files",
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "next/image": path.resolve(
          import.meta.dirname,
          "./src/shims/next/image.tsx",
        ),
        "gsap/ScrollTrigger": path.resolve(
          import.meta.dirname,
          "./src/shims/gsap-scroll-trigger.ts",
        ),
        gsap: path.resolve(import.meta.dirname, "./src/shims/gsap.ts"),
        lenis: path.resolve(import.meta.dirname, "./src/shims/lenis.ts"),
        "@lenis/react": path.resolve(
          import.meta.dirname,
          "./src/shims/lenis.ts",
        ),
      },
    },
    server: {
      proxy: {
        "/tarim-ai-api": {
          target: tarimAiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/tarim-ai-api/, ""),
        },
        "/api": { target: apiTarget, changeOrigin: true },
        "/hubs": { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
    preview: {
      proxy: {
        "/tarim-ai-api": {
          target: tarimAiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/tarim-ai-api/, ""),
        },
        "/api": { target: apiTarget, changeOrigin: true },
        "/hubs": { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
  };
});
