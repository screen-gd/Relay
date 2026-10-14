import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** Router factory TanStack Start calls once per request and once in the browser. */
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
