import { defineApp } from "convex/server";
import { v } from "convex/values";
import migrations from "@convex-dev/migrations/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp({
  env: {
    CLERK_SECRET_KEY: v.optional(v.string()),
    GOOGLE_GENERATIVE_AI_API_KEY: v.optional(v.string()),
    OPENAI_API_KEY: v.optional(v.string()),
  },
});

app.use(migrations);
app.use(rateLimiter);

export default app;
