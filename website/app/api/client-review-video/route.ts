import { getCloudflareContext } from "@opennextjs/cloudflare";
import { serveClientReviewVideo } from "@/lib/client-review-video";

export async function GET(request: Request) {
  // Next's local asset server already supports ranges; production assets do not.
  if (process.env.NODE_ENV === "development") {
    return fetch(new URL("/videos/client-review-city.mp4", request.url), {
      method: request.method,
      headers: request.headers,
    });
  }
  const { env } = getCloudflareContext();
  if (!env.ASSETS)
    return new Response("Video temporarily unavailable", { status: 503 });
  return serveClientReviewVideo(
    request,
    env.ASSETS,
    await caches.open("client-review-video")
  );
}

export const HEAD = GET;
