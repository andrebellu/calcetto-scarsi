import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

// Config separata da vite.config.js per non caricare PWA/Tailwind nei test.
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ["src/**/*.test.{js,ts}"],
    environment: "node",
  },
});
