import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { securityHeaders } from "./security-headers.mjs";

// Vercel is the production host; Nitro detects it during Vercel builds.
// `vite build --mode cloudflare` emits the optional Cloudflare Worker bundle
// that `wrangler.jsonc` deploys.
export default defineConfig(({ command, mode }) => ({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 3100 },
  preview: { port: 3100 },
  plugins: [
    tanstackStart(),
    nitro({
      preset: mode === "cloudflare" ? "cloudflare_module" : undefined,
      routeRules: {
        "/**": {
          headers: securityHeaders({ development: command === "serve" }),
        },
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
}));
