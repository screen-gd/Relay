import { clerkMiddleware } from "@clerk/nextjs/server";

// Kept as `middleware.ts` (the pre-Next-16 name) on purpose. Next.js always
// compiles `proxy.ts` to the Node.js runtime, and `@opennextjs/cloudflare`
// refuses Node.js middleware, so the Cloudflare Worker build stops with
// "Node.js middleware is not currently supported". The legacy filename still
// compiles to Edge middleware, which Vercel and Cloudflare both run. Rename it
// back to `proxy.ts` once the Cloudflare adapter supports Node.js middleware.
export default clerkMiddleware({
  frontendApiProxy: { enabled: true },
});

// Include Clerk scripts as well as API calls without intercepting local-mode pages.
export const config = {
  matcher: ["/__clerk/:path*"],
};
