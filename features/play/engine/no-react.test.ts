import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guardrail #6 (CLAUDE.md): the animation engine is pure and framework-
 * agnostic. No file in features/play/engine/ may import React (or any
 * framework). This test enforces it structurally.
 */
describe("engine purity", () => {
  it("no engine source file imports react", () => {
    const engineDir = join(__dirname);
    const sources = readdirSync(engineDir).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );
    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      const content = readFileSync(join(engineDir, file), "utf-8");
      expect(content, `${file} must not import react`).not.toMatch(
        /from\s+["']react["']|require\(["']react["']\)/,
      );
    }
  });
});
