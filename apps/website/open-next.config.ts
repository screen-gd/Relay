import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  buildCommand: "pnpm run build:next",
} satisfies OpenNextConfig;
