"use node";

import { createHash } from "node:crypto";
import {
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  MAX_BRIEF_PDF_BYTES,
  BRIEF_PDF_UNAVAILABLE_MESSAGE,
} from "./briefImportPrompt";
import { isR2Configured } from "./r2Settings";
import { client } from "./r2";

export function briefUploadKey(uploadId: Id<"briefUploads">) {
  return `brief-import/${uploadId}.pdf`;
}

export async function readBriefPdf(uploadId: Id<"briefUploads">) {
  const { s3, config } = client();
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: briefUploadKey(uploadId),
    })
  );
  if (
    object.ContentType !== "application/pdf" ||
    !object.Body ||
    !object.ContentLength ||
    object.ContentLength > MAX_BRIEF_PDF_BYTES
  )
    throw new Error("Invalid or oversized PDF (maximum 10 MB)");
  // Bound the stream too: do not trust a declared content length alone.
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > MAX_BRIEF_PDF_BYTES) throw new Error("PDF exceeds 10 MB");
    chunks.push(Buffer.from(chunk));
  }
  const data = Buffer.concat(chunks);
  if (
    size !== object.ContentLength ||
    data.subarray(0, 5).toString() !== "%PDF-"
  )
    throw new Error("Invalid PDF");
  return { data, sha256: createHash("sha256").update(data).digest("hex") };
}

export const generateUploadUrl = action({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.object({ uploadId: v.id("briefUploads"), url: v.string() }),
  handler: async (
    ctx,
    args
  ): Promise<{ uploadId: Id<"briefUploads">; url: string }> => {
    if (!isR2Configured()) throw new Error(BRIEF_PDF_UNAVAILABLE_MESSAGE);
    const { s3, config } = client();
    const { uploadId } = await ctx.runMutation(
      internal.briefImport.createUpload,
      args
    );
    const target = { Bucket: config.bucket, Key: briefUploadKey(uploadId) };
    const multipart = await s3.send(
      new CreateMultipartUploadCommand({
        ...target,
        ContentType: "application/pdf",
      })
    );
    if (!multipart.UploadId) throw new Error("Could not prepare PDF upload");
    const attached = await ctx.runMutation(
      internal.briefImport.attachMultipart,
      {
        uploadId,
        multipartId: multipart.UploadId,
      }
    );
    if (!attached) {
      await s3.send(
        new AbortMultipartUploadCommand({
          ...target,
          UploadId: multipart.UploadId,
        })
      );
      throw new Error("Brief upload expired");
    }
    const url = await getSignedUrl(
      s3,
      new UploadPartCommand({
        ...target,
        UploadId: multipart.UploadId,
        PartNumber: 1,
      }),
      { expiresIn: 15 * 60 }
    );
    return { uploadId, url };
  },
});

export const inspect = internalAction({
  args: { workspaceId: v.id("teamWorkspaces"), uploadId: v.string() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const upload = await ctx.runQuery(internal.briefImport.getUpload, args);
    if (upload.expiresAt <= Date.now()) throw new Error("Brief upload expired");
    if (!upload.multipartId) throw new Error("Brief upload not prepared");
    const { s3, config } = client();
    const target = {
      Bucket: config.bucket,
      Key: briefUploadKey(upload._id),
      UploadId: upload.multipartId,
    };
    try {
      const parts = await s3.send(
        new ListPartsCommand({ ...target, MaxParts: 2 })
      );
      const part = parts.Parts?.[0];
      if (
        parts.IsTruncated ||
        parts.Parts?.length !== 1 ||
        part?.PartNumber !== 1 ||
        !part.ETag ||
        !part.Size ||
        part.Size > MAX_BRIEF_PDF_BYTES
      )
        throw new Error("Invalid or oversized PDF upload (maximum 10 MB)");
      await s3.send(
        new CompleteMultipartUploadCommand({
          ...target,
          MultipartUpload: { Parts: [{ PartNumber: 1, ETag: part.ETag }] },
        })
      );
    } catch (error) {
      // A retry can inspect an already-finalized, immutable upload.
      if (!(error instanceof Error) || error.name !== "NoSuchUpload")
        throw error;
    }
    return (await readBriefPdf(upload._id)).sha256;
  },
});

export const cleanup = internalAction({
  args: { uploadId: v.id("briefUploads") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const target = await ctx.runQuery(internal.briefImport.cleanupTarget, args);
    if (!target) return null;
    try {
      if (!target.ready || Date.now() < target.expiresAt + 60_000)
        throw new Error("Run still active");
      const { s3, config } = client();
      if (target.multipartId) {
        try {
          await s3.send(
            new AbortMultipartUploadCommand({
              Bucket: config.bucket,
              Key: briefUploadKey(args.uploadId),
              UploadId: target.multipartId,
            })
          );
        } catch (error) {
          if (!(error instanceof Error) || error.name !== "NoSuchUpload")
            throw error;
        }
      }
      await s3.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: briefUploadKey(args.uploadId),
        })
      );
      await ctx.runMutation(internal.briefImport.finishCleanup, args);
    } catch {
      await ctx.scheduler.runAfter(
        60_000,
        internal.briefImportUploads.cleanup,
        args
      );
    }
    return null;
  },
});
