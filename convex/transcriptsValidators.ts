import { v } from "convex/values";
import { z } from "zod";

export const transcript = v.object({
  mediaVersionId: v.id("projectMediaVersions"),
  uploadedBy: v.string(),
  sourceName: v.string(),
});
export const transcriptSegment = v.object({
  transcriptId: v.id("transcripts"),
  startSeconds: v.number(),
  endSeconds: v.number(),
  text: v.string(),
});
export const transcriptMatch = v.object({
  transcriptId: v.id("transcripts"),
  commentId: v.id("mediaVersionComments"),
  segmentId: v.union(v.id("transcriptSegments"), v.null()),
  runId: v.id("aiRuns"),
});
export const transcriptMatchDraft = v.object({
  comment: v.number(),
  segmentId: v.union(v.string(), v.null()),
});
export const transcriptInputSchema = z.object({
  segments: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        startSeconds: z.number().min(0),
        endSeconds: z.number().min(0),
        text: z.string().min(1).max(500),
      })
    )
    .min(1)
    .max(300),
  comments: z
    .array(
      z.object({
        text: z.string().min(1).max(1000),
        timestamp: z.number().min(0).nullable(),
      })
    )
    .min(1)
    .max(20),
});
export const transcriptOutputSchema = z.object({
  matches: z
    .array(
      z.object({
        comment: z.number().int().min(0).max(19),
        segmentId: z.string().min(1).max(80).nullable(),
      })
    )
    .min(1)
    .max(20),
});

export function validateTranscriptMatches(
  output: z.output<typeof transcriptOutputSchema>,
  segmentIds: ReadonlySet<string>,
  commentCount: number
) {
  transcriptOutputSchema.parse(output);
  const comments = new Set<number>();
  for (const match of output.matches) {
    if (
      match.comment >= commentCount ||
      comments.has(match.comment) ||
      (match.segmentId !== null && !segmentIds.has(match.segmentId))
    )
      throw new Error("Unknown or duplicate transcript source");
    comments.add(match.comment);
  }
  if (comments.size !== commentCount)
    throw new Error("Missing transcript matches");
}
