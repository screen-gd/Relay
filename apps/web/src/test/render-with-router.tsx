import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

/**
 * Renders `ui` to static HTML inside a memory router opened at `pathname`,
 * so components that use `Link` or router hooks work in unit tests.
 */
export async function renderWithRouter(ui: ReactNode, pathname = "/") {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: [pathname] }),
  });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
}
