// L1.50's prove half: the starter passes on real Better Auth sign-in, and each of the journey author's fixtures fails
// where its README says, in a scratch copy of the starter.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Prove } from "./service.ts";

// Dot-folders (.wrangler, .architect) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");

const starter = resolve(import.meta.dirname, "../../../../../examples/starter");
const fixtures = join(starter, "test/fixtures/journeys");
const scratch = join(starter, "test/tmp/prove");

const copy = (name: string, installs: ReadonlyArray<readonly [string, string]>) => {
  const root = join(scratch, name, "starter");
  rmSync(join(scratch, name), { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "implementation", "journeys", "package.json"]) cpSync(join(starter, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(starter, "tsconfig.json")) }));
  for (const [from, to] of installs) cpSync(join(fixtures, name, from), join(root, to));
  return root;
};
const prove = (root: string, port: number) => Effect.runPromise(Effect.scoped(Prove.run({ root, port })));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("the starter", () => {
  it("proves: five journeys, eleven operations with nine evals each", { timeout: 180_000 }, async () => {
    const report = await prove(starter, 8810);
    expect(report.lines.filter((l) => l.startsWith("journey ") && l.includes(" ✔ "))).toHaveLength(5);
    expect(report.lines.filter((l) => / 9 evals ✔ p50 /.test(l))).toHaveLength(11);
    expect(report.lines.at(-1)).toBe("prove ✔");
  });

  const cases = [
    ["wrong-password-signs-in", "session/sign-in.ts", "implementation/handlers/session/sign-in.ts", 'journey sign up and sign in ✘', '✘ "a wrong password is refused"'],
    ["accept-without-membership", "invitation/accept.ts", "implementation/handlers/invitation/accept.ts", "journey invite and accept ✘", '✘ "olga reads her membership'],
    ["owner-step-skipped", "organization/create.ts", "implementation/handlers/organization/create.ts", "journey an owner makes an api key ✘", "organization.create steps ✘"],
  ] as const;
  cases.forEach(([name, from, to, journey, detail], i) => {
    it(`fails on ${name}`, { timeout: 180_000 }, async () => {
      const report = await prove(copy(name, [[from, to]]), 8811 + i);
      expect(report.passed).toBe(false);
      expect(report.lines.some((l) => l.startsWith(journey)), report.lines.join("\n")).toBe(true);
      expect(report.lines.some((l) => l.includes(detail)), report.lines.join("\n")).toBe(true);
    });
  });
});
