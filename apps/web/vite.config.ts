import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import { securityHeaders } from "./security-headers.mjs";

// Vercel is the production host; Nitro detects it during Vercel builds.
// `vite build --mode cloudflare` emits the optional Cloudflare Worker bundle
// that `wrangler.jsonc` deploys.
export default defineConfig(({ command, mode }) => {
  // The Cloudflare mode would otherwise skip `.env.production`. Vite keeps
  // `VITE_*` values already in process.env, so load them first.
  if (mode === "cloudflare")
    process.env = {
      ...loadEnv("production", process.cwd(), "VITE_"),
      ...process.env,
    };
  return {
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { port: 3100, strictPort: true },
    preview: { port: 3100 },
    plugins: [
      tanstackStart(),
      nitro({
        preset: mode === "cloudflare" ? "cloudflare_module" : undefined,
        // Rolldown's chunk optimizer can place the `__exportAll` helper in a
        // circular chunk, which makes every SSR request fail at module load
        // ("__exportAll is not a function"). Remove once Rolldown fixes it.
        rolldownConfig: { experimental: { chunkOptimization: false } },
        routeRules: {
          "/**": {
            headers: securityHeaders({ development: command === "serve" }),
          },
        },
      }),
      viteReact(),
      tailwindcss(),
    ],
  };
});
