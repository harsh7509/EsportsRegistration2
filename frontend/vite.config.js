// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ViteSitemapPlugin } from "vite-plugin-sitemap"; // <-- named export

export default defineConfig({
  plugins: [
    react(),
    ViteSitemapPlugin({
      hostname: "https://thearenapulse.xyz",
      robots: false,     // robots.txt ko touch mat karo
      // optionally: routes: [],  // agar aap khud routes doge to
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/socket.io": { target: "http://localhost:4000", ws: true, changeOrigin: true },
      "/uploads": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
