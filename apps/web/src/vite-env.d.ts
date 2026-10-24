/// <reference types="vite/client" />

// Public build-time settings. Vite inlines `VITE_*` values into client and
// server bundles, so never put a secret in one of these.
interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_FILE_STORAGE_PROVIDER?: "convex" | "r2";
  readonly VITE_BILLING_PURCHASES_ENABLED?: "true" | "false";
  readonly VITE_ONBOARDING_V2?: "true" | "false";
  readonly VITE_RELAY_ANALYTICS_ENDPOINT?: string;
  readonly VITE_RELAY_ERROR_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
