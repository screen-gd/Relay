import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["evals/feedback-revisions/*.eval.ts"],
    testTimeout: 180_000,
  },
});
