import { clerkFrontendApiProxy, matchProxyPath } from "@clerk/backend/proxy";
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

// Forwards `/__clerk/*` scripts and API calls to Clerk's Frontend API. Pages
// keep client-side Clerk auth, so no other request runs Clerk on the server.
export const clerkProxyMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    if (!matchProxyPath(request)) return next();
    throw await clerkFrontendApiProxy(request, {
      publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }
);

// Start skips its default CSRF check once this file exists, so add it back.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [clerkProxyMiddleware, csrfMiddleware],
}));
