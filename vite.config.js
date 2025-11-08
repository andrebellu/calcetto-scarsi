import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    sveltekit(),
    tailwindcss(),
    SvelteKitPWA({
      strategies: "injectManifest",
      injectManifest: {
        swSrc: "src/service-worker.ts",
        swDest: "service-worker.js",
      },

      devOptions: {
        enabled: false,
        type: "module",
      },

      manifest: {
        id: "/",
        name: "Calcetto Scarsi",
        short_name: "Calcetto",
        description: "Gestisci partite e classifiche del calcetto tra amici!",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#007bff",
        scope: "/",
        icons: [
          {
            src: "icons/android/android-launchericon-192-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/android/android-launchericon-512-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          { src: "icons/ios/180.png", sizes: "180x180", type: "image/png" },
        ],
        screenshots: [
          {
            src: "screenshots/desktop.png",
            sizes: "1919x965",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "screenshots/mobile.png",
            sizes: "404x870",
            type: "image/png",
            form_factor: undefined,
          },
        ],
      },

      includeAssets: [
        "./icons/android/*.png",
        "./icons/ios/*.png",
        "./screenshots/*.png",
      ],

      workbox: {
        globPatterns: [
          "_app/**/*.{js,css,html,png,svg,ico}",
          "_app/immutable/**/*.{js,css,html,png,svg,ico}",
        ],
        navigateFallback: "/",
        navigateFallbackAllowlist: [/^\/$/],
      },
    }),
  ],
});
