// Security headers applied to every response through Nitro route rules in
// vite.config.ts. `scripts/check-stripe-csp.test.mjs` asserts the CSP contract.

/** Builds the Content-Security-Policy. Development adds 'unsafe-eval' for Vite HMR. */
export function contentSecurityPolicy({ development = false } = {}) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://accounts.relay-app.cc.cd https://challenges.cloudflare.com https://*.protect.clerk.com https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "img-src 'self' data: blob: https:",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://clerk.relay-app.cc.cd https://challenges.cloudflare.com https://*.protect.clerk.com https://static.cloudflareinsights.com https://js.stripe.com https://checkout.stripe.com https://www.youtube.com https://player.vimeo.com`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self'${development ? " ws: wss:" : ""} https://*.convex.cloud wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com https://clerk.relay-app.cc.cd https://*.protect.clerk.com:* https://clerk-telemetry.com https://cloudflareinsights.com https://api.stripe.com https://m.stripe.network https://r.stripe.com https://q.stripe.com https://checkout.stripe.com`,
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Header name to value map for every route. */
export function securityHeaders({ development = false } = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": contentSecurityPolicy({ development }),
  };
}
