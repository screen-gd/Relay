"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { readBriefPdf } from "./briefImportUploads";
import { generateAiObject } from "./aiGeneration";
import {
  briefInputSchema,
  briefDraftSchema,
  briefInstructions,
} from "./briefImportPrompt";

export const run = internalAction({
  args: { runId: v.id("aiRuns"), inputJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, inputJson }) => {
    const run = await ctx.runQuery(internal.aiRuns.getExecution, { runId });
    if (!run || run.feature !== "brief_import") return null;
    if (!(await ctx.runQuery(internal.briefImport.canExecute, { runId }))) {
      await ctx.runMutation(internal.aiRuns.fail, {
        runId,
        failureCode: "access_revoked",
      });
      return null;
    }
    try {
      const input = briefInputSchema.parse(JSON.parse(inputJson));
      let pdf;
      if (input.kind === "pdf") {
        if (!input.sha256) throw new Error("Verified PDF required");
        const upload = await ctx.runQuery(internal.briefImport.uploadForRun, {
          runId,
          uploadId: input.uploadId,
          sha256: input.sha256,
        });
        pdf = await readBriefPdf(upload._id);
        if (pdf.sha256 !== input.sha256)
          throw new Error("PDF changed after validation");
      }
      await generateAiObject(ctx, {
        runId,
        modelTier: run.modelTier,
        schema: briefDraftSchema,
        prompt: [
          { role: "system", content: briefInstructions },
          {
            role: "user",
            content:
              input.kind === "text"
                ? [
                    {
                      type: "text",
                      text: JSON.stringify({ untrustedBrief: input.text }),
                    },
                  ]
                : [
                    {
                      type: "file",
                      data: pdf!.data,
                      mediaType: "application/pdf",
                    },
                  ],
          },
        ],
        save: (_output, completion) =>
          ctx.runMutation(internal.briefImport.save, { completion }),
      });
    } catch {
      await ctx.runMutation(internal.aiRuns.fail, {
        runId,
        failureCode: "provider_error",
      });
    }
    return null;
  },
});
