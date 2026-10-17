import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "vite";
import { expect, test } from "vitest";
import { deriveAccentTokens } from "./route-theme";

test("minified theme boot applies a stored custom accent before hydration", async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: true,
      lib: {
        entry: fileURLToPath(new URL("./route-theme.ts", import.meta.url)),
        formats: ["cjs"],
      },
    },
  });
  const bundles = Array.isArray(result)
    ? result
    : "output" in result
      ? [result]
      : [];
  const chunk = bundles
    .flatMap((bundle) => bundle.output)
    .find((output) => output.type === "chunk");
  if (!chunk) throw new Error("Theme build did not produce a JavaScript chunk");

  const module = { exports: {} };
  const bootScript: unknown = runInNewContext(
    `${chunk.code}\nmodule.exports.themeBootScript`,
    { module, exports: module.exports }
  );
  if (typeof bootScript !== "string") {
    throw new Error("Theme build did not export the boot script");
  }

  const accentColor = "#2563eb";
  for (const theme of ["Dark", "Light"]) {
    const properties = new Map<string, string>();
    const root = {
      dataset: { theme: "" },
      style: {
        colorScheme: "",
        setProperty: (name: string, value: string) =>
          properties.set(name, value),
        removeProperty: (name: string) => properties.delete(name),
      },
      classList: { toggle: () => {} },
    };
    runInNewContext(bootScript, {
      document: { documentElement: root },
      window: {
        localStorage: {
          getItem: () => JSON.stringify({ theme, accentColor }),
        },
      },
    });

    const tokens = deriveAccentTokens(accentColor, theme === "Dark");
    expect(root.dataset.theme).toBe(theme.toLowerCase());
    expect(properties).toEqual(
      new Map([
        ["--accent", tokens.accent],
        ["--accent-foreground", tokens.foreground],
        ["--accent-mark", tokens.mark],
      ])
    );
  }
});
