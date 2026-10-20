/** Serve the demo through the Cache API so browsers can seek with byte ranges. */
export async function serveClientReviewVideo(
  request: Request,
  assets: NonNullable<CloudflareEnv["ASSETS"]>,
  cache: Cache
) {
  const assetUrl = new URL("/videos/client-review-city.mp4", request.url);
  const asset = await assets.fetch(new Request(assetUrl));
  if (asset.status !== 200) return asset;

  // The asset hash keeps a replaced video out of an older cached response.
  assetUrl.searchParams.set("etag", asset.headers.get("ETag") ?? "");
  const headers = new Headers(request.headers);
  const ifRange = headers.get("If-Range");
  if (
    request.method === "HEAD" ||
    (ifRange && ifRange !== asset.headers.get("ETag"))
  ) {
    headers.delete("Range");
  }
  const cacheRequest = new Request(assetUrl, { headers });
  let response = await cache.match(cacheRequest);
  if (response) {
    await asset.body?.cancel();
  } else {
    const cacheHeaders = new Headers(asset.headers);
    cacheHeaders.set("Cache-Control", "public, max-age=3600");
    cacheHeaders.set("Accept-Ranges", "bytes");
    await cache.put(
      new Request(assetUrl),
      new Response(asset.body, { headers: cacheHeaders })
    );
    response = await cache.match(cacheRequest);
  }
  if (!response)
    return new Response("Video temporarily unavailable", { status: 503 });
  response = new Response(response.body, response);
  response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  if (request.method !== "HEAD") return response;

  await response.body?.cancel();
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
