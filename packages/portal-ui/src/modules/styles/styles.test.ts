import { Effect } from "effect";
import { expect, it } from "vitest";
import { sheet } from "./internal/read.ts";
import { Styles } from "./service.ts";

it("our sheet draws the meters and the lifecycle, and takes its colours from HeroUI's tokens", () => {
  expect(Styles.ours).toContain(".calls-meter");
  expect(Styles.ours).toContain(".lifecycle");
  expect(Styles.ours).not.toMatch(/\bcolor:#[0-9a-f]{3,6}[;}]/i);
});

it("a package that is not installed is a StylesUnavailable value", async () => {
  const failure = await Effect.runPromise(Effect.flip(sheet("@orthograph/not-installed", "x.css")));
  expect(failure._tag).toBe("StylesUnavailable");
});
