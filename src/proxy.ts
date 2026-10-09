import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  frontendApiProxy: { enabled: true },
});

// Include Clerk scripts as well as API calls without intercepting local-mode pages.
export const config = {
  matcher: ["/__clerk/:path*"],
};
