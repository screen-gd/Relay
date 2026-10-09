import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";

test("client review video supports seeking with a cold and warm cache", async () => {
  const video = await readFile(
    new URL("../website/public/videos/client-review-city.mp4", import.meta.url)
  );
  let etag = '"original-video"';
  const bundle = await build({
    stdin: {
      contents: `import { serveClientReviewVideo } from "./website/lib/client-review-video.ts";
        export default { async fetch(request, env) {
          return serveClientReviewVideo(request, env.ASSETS, await caches.open("client-review-video"));
        } };`,
      resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    },
    bundle: true,
    format: "esm",
    write: false,
  });
  const worker = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "client-review-video-test",
          modules: true,
          script: bundle.outputFiles[0].text,
          compatibilityDate: "2026-08-07",
          serviceBindings: {
            ASSETS(request) {
              assert.equal(
                new URL(request.url).pathname,
                "/videos/client-review-city.mp4"
              );
              assert.equal(request.headers.get("Range"), null);
              return new Response(video, {
                headers: {
                  "Content-Type": "video/mp4",
                  "Content-Length": String(video.length),
                  ETag: etag,
                },
              });
            },
          },
        },
      ],
    })
  );
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await worker.dispatchFetch(
        "https://marketing.test/api/client-review-video",
        {
          headers: { Range: "bytes=100000-100100" },
        }
      );
      assert.equal(response.status, 206);
      assert.equal(
        response.headers.get("Content-Range"),
        `bytes 100000-100100/${video.length}`
      );
      assert.equal(response.headers.get("Accept-Ranges"), "bytes");
      assert.deepEqual(
        Buffer.from(await response.arrayBuffer()),
        video.subarray(100000, 100101)
      );
    }
    const suffix = await worker.dispatchFetch(
      "https://marketing.test/api/client-review-video",
      {
        headers: { Range: "bytes=-32" },
      }
    );
    assert.equal(suffix.status, 206);
    assert.deepEqual(
      Buffer.from(await suffix.arrayBuffer()),
      video.subarray(-32)
    );

    const invalid = await worker.dispatchFetch(
      "https://marketing.test/api/client-review-video",
      {
        headers: { Range: `bytes=${video.length}-` },
      }
    );
    assert.equal(invalid.status, 416);
    await invalid.arrayBuffer();

    const head = await worker.dispatchFetch(
      "https://marketing.test/api/client-review-video",
      { method: "HEAD" }
    );
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("Content-Length"), String(video.length));
    assert.equal((await head.arrayBuffer()).byteLength, 0);

    etag = '"replacement-video"';
    const replaced = await worker.dispatchFetch(
      "https://marketing.test/api/client-review-video",
      {
        headers: { Range: "bytes=0-31", "If-Range": '"original-video"' },
      }
    );
    assert.equal(replaced.status, 200);
    assert.equal(replaced.headers.get("ETag"), etag);
    assert.deepEqual(Buffer.from(await replaced.arrayBuffer()), video);
  } finally {
    await worker.dispose();
  }

  const assetWorker = new Miniflare(
    convertV4MiniflareOptions({
      name: "client-review-assets-test",
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: "2026-08-07",
      assets: {
        directory: fileURLToPath(new URL("../website/public", import.meta.url)),
        binding: "ASSETS",
        run_worker_first: true,
        routerConfig: { has_user_worker: true },
      },
    })
  );
  try {
    const response = await assetWorker.dispatchFetch(
      "https://marketing.test/api/client-review-video",
      { headers: { Range: "bytes=100000-100100" } }
    );
    assert.equal(response.status, 206, await response.clone().text());
    assert.deepEqual(
      Buffer.from(await response.arrayBuffer()),
      video.subarray(100000, 100101)
    );
  } finally {
    await assetWorker.dispose();
  }
});
