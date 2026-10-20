import { createFileRoute } from "@tanstack/react-router";
import { noIndex } from "@/lib/route-head";

// Keeps every client portal page out of search indexes.
export const Route = createFileRoute("/client-portal")({
  head: () => ({ meta: [noIndex] }),
});
