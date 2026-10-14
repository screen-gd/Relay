import { clerkFrontendApiProxy, matchProxyPath } from "@clerk/backend/proxy";
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

// Forwards `/__clerk/*` scripts and API calls to Clerk's Frontend API and
// returns the upstream response. Returns undefined for every other path.
export async function handleClerkProxy(request: Request) {
  if (!matchProxyPath(request)) return undefined;
  return clerkFrontendApiProxy(request, {
    publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });
}

// Pages keep client-side Clerk auth, so no other request runs Clerk on the
// server.
export const clerkProxyMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const response = await handleClerkProxy(request);
    if (!response) return next();
    throw response;
  }
);

// Start skips its default CSRF check once this file exists, so add it back.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [clerkProxyMiddleware, csrfMiddleware],
}));
