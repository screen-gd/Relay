import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/app/providers.test.tsx",
      "src/app/client-hub/page.test.tsx",
      "src/components/subscription-plans.test.tsx",
    ],
  },
});
