import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    sitemap({ hostname: "https://thearenapulse.xyz" }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://esportsregistration2.onrender.com",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "https://esportsregistration2.onrender.com",
        ws: true,
        changeOrigin: true,
      },
      "/uploads": {
        target: "https://esportsregistration2.onrender.com",
        changeOrigin: true,
      },
    },
  },
});
