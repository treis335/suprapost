import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev`, the frontend runs on its own port (5173) and
// proxies any /api/* call to the backend on localhost:3001.
// In production, the backend serves the built /dist folder directly,
// so no proxy is needed there — same origin, no CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
