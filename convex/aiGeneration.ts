import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  generateObject,
  generateText,
  isStepCount,
  Output,
  type ToolSet,
  type ModelMessage,
} from "ai";
import type { Infer } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { aiCompletionValidator, aiModelTierValidator } from "./aiValidators";

type ModelTier = Infer<typeof aiModelTierValidator>;
export type AiCompletion = Infer<typeof aiCompletionValidator>;

export const aiModels = {
  default: { provider: "google", modelId: "gemini-3.8-flash" },
  better: { provider: "openai", modelId: "gpt-5.5" },
} as const;

const callSettings = {
  providerOptions: { openai: { store: false } },
  maxOutputTokens: 8000,
  maxRetries: 0,
} as const;

/** Provider instance for a tier, reading only the Convex environment keys. */
function languageModel(modelTier: ModelTier) {
  const selected = aiModels[modelTier];
  const key =
    selected.provider === "google"
      ? process.env.GOOGLE_GENERATIVE_AI_API_KEY
      : process.env.OPENAI_API_KEY;
  if (!key) throw new Error("AI provider is not configured");
  const model =
    selected.provider === "google"
      ? createGoogleGenerativeAI({ apiKey: key })(selected.modelId)
      : createOpenAI({ apiKey: key })(selected.modelId);
  return { selected, model };
}

function recordedUsage(usage: {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}) {
  if (usage.inputTokens === undefined || usage.outputTokens === undefined)
    throw new Error("AI token usage unavailable");
  return { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

// Also used by the opt-in eval harness. Production callers use generateAiObject.
export async function generateDraft<S extends z.ZodType>(options: {
  modelTier: ModelTier;
  prompt: string | ModelMessage[];
  schema: S;
}) {
  const { selected, model } = languageModel(options.modelTier);
  const result = await generateObject({
    model,
    schema: options.schema,
    prompt: options.prompt,
    ...callSettings,
    abortSignal: AbortSignal.timeout(120_000),
  });
  return {
    output: options.schema.parse(result.object) as z.output<S>,
    provider: selected.provider,
    modelId: result.response.modelId || selected.modelId,
    ...recordedUsage(result.usage),
  };
}

/**
 * Tool-calling variant of `generateDraft`. The model may call `tools` for up
 * to `maxSteps` steps, then must return an object matching `schema`.
 * `toolOutputs` lists every tool result in call order so callers can check
 * the answer against what the tools actually returned.
 */
export async function generateToolDraft<S extends z.ZodType>(options: {
  modelTier: ModelTier;
  prompt: string;
  schema: S;
  tools: ToolSet;
  maxSteps: number;
}) {
  const { selected, model } = languageModel(options.modelTier);
  const result = await generateText({
    model,
    tools: options.tools,
    prompt: options.prompt,
    output: Output.object({ schema: options.schema }),
    stopWhen: isStepCount(options.maxSteps),
    ...callSettings,
    abortSignal: AbortSignal.timeout(120_000),
  });
  return {
    output: options.schema.parse(result.output) as z.output<S>,
    toolOutputs: result.steps.flatMap((step) =>
      step.toolResults.map((toolResult): unknown => toolResult.output)
    ),
    provider: selected.provider,
    modelId: result.response.modelId || selected.modelId,
    ...recordedUsage(result.totalUsage),
  };
}

type Draft<T> = {
  output: T;
  provider: AiCompletion["provider"];
  modelId: string;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Thrown when a model's output fails a feature's `verify` check, so the run
 * fails with `verification_failed` instead of `provider_error`.
 */
export class AiVerificationError extends Error {
  constructor(cause: unknown) {
    super(
      cause instanceof Error ? cause.message : "AI output failed verification"
    );
    this.name = "AiVerificationError";
  }
}

/** Shared claim → produce → complete/fail lifecycle for both runners. */
async function runClaimed<T>(
  ctx: Pick<ActionCtx, "runMutation">,
  runId: Id<"aiRuns">,
  produce: () => Promise<Draft<T>>,
  save?: (output: T, completion: AiCompletion) => Promise<boolean>
): Promise<T | null> {
  try {
    if (!(await ctx.runMutation(internal.aiRuns.claim, { runId }))) return null;
    const { output, provider, modelId, inputTokens, outputTokens } =
      await produce();
    const completion = {
      runId,
      outputJson: JSON.stringify(output),
      provider,
      modelId,
      inputTokens,
      outputTokens,
    };
    const completed = save
      ? await save(output, completion)
      : await ctx.runMutation(internal.aiRuns.complete, completion);
    return completed ? output : null;
  } catch (error) {
    await ctx.runMutation(internal.aiRuns.fail, {
      runId,
      failureCode:
        error instanceof AiVerificationError
          ? "verification_failed"
          : "provider_error",
    });
    return null;
  }
}

// Claims once, validates, and completes safely. A save callback must call
// complete the run in its save mutation so feature writes and completion are atomic.
export async function generateAiObject<S extends z.ZodType>(
  ctx: Pick<ActionCtx, "runMutation">,
  options: {
    runId: Id<"aiRuns">;
    modelTier: ModelTier;
    prompt: string | ModelMessage[];
    schema: S;
    save?: (output: z.output<S>, completion: AiCompletion) => Promise<boolean>;
  }
): Promise<z.output<S> | null> {
  return runClaimed(
    ctx,
    options.runId,
    () => generateDraft(options),
    options.save
  );
}

/**
 * Same lifecycle as `generateAiObject`, with tool calling. `verify` receives
 * the parsed output and every tool result; throwing rejects the output and
 * fails the run with `verification_failed` before anything is saved.
 */
export async function generateAiObjectWithTools<S extends z.ZodType>(
  ctx: Pick<ActionCtx, "runMutation">,
  options: {
    runId: Id<"aiRuns">;
    modelTier: ModelTier;
    prompt: string;
    schema: S;
    tools: ToolSet;
    maxSteps: number;
    verify: (output: z.output<S>, toolOutputs: unknown[]) => void;
    save?: (output: z.output<S>, completion: AiCompletion) => Promise<boolean>;
  }
): Promise<z.output<S> | null> {
  return runClaimed(
    ctx,
    options.runId,
    async () => {
      const { toolOutputs, ...draft } = await generateToolDraft(options);
      try {
        options.verify(draft.output, toolOutputs);
      } catch (error) {
        throw new AiVerificationError(error);
      }
      return draft;
    },
    options.save
  );
}
