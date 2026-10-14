// Serves /sitemap.xml
import { createFileRoute } from "@tanstack/react-router";
import { siteUrl } from "@/lib/site";

const publicRoutes = ["/accessibility", "/contact", "/privacy", "/terms"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = publicRoutes
          .map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`)
          .join("\n");
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
