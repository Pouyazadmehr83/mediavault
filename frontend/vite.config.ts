import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The dev server proxies /api to Django so the browser sees a single origin
// (no CORS setup needed). Inside Docker the target is the `web` service.
const apiTarget = process.env.VITE_API_PROXY ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Keep the browser Host header so it matches DJANGO_ALLOWED_HOSTS (localhost).
      "/api": { target: apiTarget },
    },
  },
});
