/**
 * R2 settings read from the deployment env vars. They live in a module
 * without the "use node" directive so the Node runtime (uploads) and the
 * default runtime (the availability query) read the same vars, and the env
 * var names are written down once.
 */
export type R2Settings = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

/** True when the deployment has the env vars an R2 upload needs. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

/** The R2 settings, or an error when the deployment has none. */
export function r2Settings(): R2Settings {
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.R2_REGION ?? "auto";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET."
    );
  }
  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}
