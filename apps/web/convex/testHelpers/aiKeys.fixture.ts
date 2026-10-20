import type { TestConvex } from "convex-test";
import { vi } from "vitest";
import type { Id } from "../_generated/dataModel";
import { encryptCredential } from "../aiCredentials";
import type schema from "../schema";

export async function seedAiKeys(
  t: TestConvex<typeof schema>,
  workspaceId: Id<"teamWorkspaces">
) {
  vi.stubEnv("AI_BYOK_ENCRYPTION_KEY", "a1".repeat(32));
  for (const provider of ["google", "openai"] as const) {
    const encrypted = await encryptCredential(
      workspaceId,
      provider,
      `${provider}-workspace-test-key`
    );
    await t.run((ctx) =>
      ctx.db.insert("aiProviderKeys", { workspaceId, provider, ...encrypted })
    );
  }
}
