import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The browser talks only to the portal's own server (server/main.ts), never to a telemetry backend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5193, strictPort: true, host: "127.0.0.1", proxy: { "/api": "http://127.0.0.1:8793" } },
});
