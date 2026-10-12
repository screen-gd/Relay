import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { z } from "zod";
import { aiModels, generateDraft } from "../../convex/aiGeneration";
import {
  revisionInputSchema,
  revisionOutputSchema,
  revisionPrompt,
} from "../../convex/revisionItemsPrompt";

const fixtureSchema = z.array(
  z.object({
    name: z.string(),
    input: revisionInputSchema,
    groups: z.array(z.array(z.number().int().nonnegative())),
    vagueSources: z.array(z.number().int().nonnegative()),
    scopeSources: z.array(z.number().int().nonnegative()),
  })
);
const folder = join(import.meta.dirname, "fixtures");
const fixtures = [folder, join(folder, "real")].flatMap((directory) =>
  readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) =>
      fixtureSchema.parse(
        JSON.parse(readFileSync(join(directory, name), "utf8"))
      )
    )
);
const paid = process.env.RELAY_RUN_PAID_EVALS === "1";

test("fixtures have complete source coverage and bounded permitted input", () => {
  for (const fixture of fixtures) {
    expect([...new Set(fixture.groups.flat())].sort((a, b) => a - b)).toEqual(
      fixture.input.comments.map((_, index) => index)
    );
    for (const index of [...fixture.vagueSources, ...fixture.scopeSources])
      expect(index).toBeLessThan(fixture.input.comments.length);
  }
});

for (const modelTier of ["default", "better"] as const) {
  for (const fixture of fixtures) {
    test.skipIf(!paid)(`${modelTier}: ${fixture.name}`, async () => {
      try {
        const result = await generateDraft({
          modelTier,
          apiKey:
            (modelTier === "default"
              ? process.env.GOOGLE_GENERATIVE_AI_API_KEY
              : process.env.OPENAI_API_KEY) ?? "",
          prompt: revisionPrompt(fixture.input),
          schema: revisionOutputSchema,
        });
        const groups = result.output.items.map((item) =>
          [...new Set(item.sources)].sort((a, b) => a - b)
        );
        const flagged = (field: "vague" | "possibleNewScope") =>
          [
            ...new Set(
              result.output.items
                .filter((item) => item[field])
                .flatMap((item) => item.sources)
            ),
          ].sort((a, b) => a - b);
        console.log(
          JSON.stringify({
            fixture: fixture.name,
            model: result.modelId,
            provider: result.provider,
            groupMatches: fixture.groups.filter((group) =>
              groups.some(
                (actual) => JSON.stringify(actual) === JSON.stringify(group)
              )
            ).length,
            expectedGroups: fixture.groups.length,
            actualGroups: groups,
            vagueSources: flagged("vague"),
            expectedVagueSources: fixture.vagueSources,
            scopeSources: flagged("possibleNewScope"),
            expectedScopeSources: fixture.scopeSources,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          })
        );
        expect(
          groups.flat().every((index) => index < fixture.input.comments.length)
        ).toBe(true);
      } catch {
        throw new Error(
          `Eval failed: ${fixture.name} / ${aiModels[modelTier].modelId}`
        );
      }
    });
  }
}
