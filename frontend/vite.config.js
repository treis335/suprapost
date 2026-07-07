import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_URL is only needed when frontend and backend are on different origins.
// - Local dev: leave unset — proxy to localhost:3001 is used automatically
// - Production (Vercel + Cloudflare tunnel): set VITE_API_URL=https://api.yourdomain.com
const apiUrl = process.env.VITE_API_URL || "";

export default defineConfig({
  plugins: [react()],
  define: {
    // Makes VITE_API_URL available inside the React app as __API_URL__
    __API_URL__: JSON.stringify(apiUrl),
  },
  server: {
    port: 5173,
    proxy: apiUrl ? {} : {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
