import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_ prefixed variables are automatically exposed by Vite via import.meta.env
// No need for loadEnv or define() — Vite handles this natively.
// Just set VITE_API_URL in Vercel Environment Variables and it works.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In local dev, proxy /api to the local backend.
      // In production (Vercel), VITE_API_URL is set so the frontend
      // calls the Cloudflare tunnel directly — proxy is not used.
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
