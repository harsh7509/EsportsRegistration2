// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ViteSitemapPlugin } from "vite-plugin-sitemap";

// Helper: paginate karke sab items lao
async function fetchAll(url, pick = (x) => x) {
  const out = [];
  let page = 1;
  for (;;) {
    const resp = await fetch(`${url}${url.includes('?') ? '&' : '?'}page=${page}&limit=200`);
    if (!resp.ok) break;
    const data = await resp.json();
    const items = pick(data) || [];
    out.push(...items);
    const totalPages = Number(data?.totalPages || 1);
    if (page >= totalPages) break;
    page += 1;
  }
  return out;
}

export default defineConfig({
  plugins: [
    react(),
    ViteSitemapPlugin({
      hostname: "https://thearenapulse.xyz",
      robots: false, // aapka public/robots.txt as-is rahega

      // IMPORTANT: sari final URLs yahan return honi chahiye
      routes: async () => {
        const API = (process.env.BACKEND_PUBLIC_URL || "http://localhost:4000").replace(/\/+$/, "");

        // 1) Static pages (aap jo chahe add/remove)
        const staticRoutes = [
          "/", "/about", "/contact",
          "/scrims", "/tournaments", "/organizations",
          "/privacy", "/terms",
        ];

        // 2) Dynamic — Scrims
        let scrimRoutes = [];
        try {
          const scrims = await fetchAll(`${API}/api/scrims`, (d) => d.items);
          scrimRoutes = scrims.map((s) => `/scrims/${s._id}`);
        } catch (_) {}

        // 3) Dynamic — Orgs
        let orgRoutes = [];
        try {
          // aapke services me /api/orgs and /api/organizations dono possible the
          const resp1 = await fetchAll(`${API}/api/orgs`, (d) => d.items || d);
          const resp2 = resp1.length ? resp1 : await fetchAll(`${API}/api/organizations`, (d) => d.items || d);
          orgRoutes = resp2
            .map((o) => o._id || o.id)
            .filter(Boolean)
            .map((id) => `/organizations/${id}`);
        } catch (_) {}

        // 4) Dynamic — Tournaments
        let tourRoutes = [];
        try {
          const tours = await fetchAll(`${API}/api/tournaments`, (d) => d.items || d);
          tourRoutes = tours
            .map((t) => t._id || t.id)
            .filter(Boolean)
            .map((id) => `/tournaments/${id}`);
        } catch (_) {}

        return [
          ...staticRoutes,
          ...scrimRoutes,
          ...orgRoutes,
          ...tourRoutes,
        ];
      },

      // (optional) tuning
      changefreq: "daily",
      priority: 0.7,
      generateRobotsTxt: false, // extra safety
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
