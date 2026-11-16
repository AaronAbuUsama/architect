import { describe, expect, it } from "vitest";
import { Check } from "./service.ts";

describe("Check.blanks", () => {
  it("finds every Blueprint.todo with its line and what it waits for, grouped by its thing", () => {
    const blanks = Check.blanks([
      { path: "blueprint/things/allowance/thing.ts", text: 'a\n  description: Blueprint.todo("what it is"),\n' },
      { path: "blueprint/things/allowance/verbs/spend.ts", text: "x: Blueprint.todo<string>('who'), y: Blueprint.todo()" },
      { path: "blueprint/journeys/one.ts", text: "// no blanks" },
    ]);
    expect(blanks).toEqual([
      { file: "blueprint/things/allowance/thing.ts", line: 2, owner: "allowance", what: "what it is" },
      { file: "blueprint/things/allowance/verbs/spend.ts", line: 1, owner: "allowance", what: "who" },
      { file: "blueprint/things/allowance/verbs/spend.ts", line: 1, owner: "allowance", what: "(no description)" },
    ]);
    expect(Check.report(blanks).lines[0]).toBe("allowance has 3 blanks");
    expect(Check.report([])).toEqual({ lines: ["blanks left 0"], passed: true });
  });
});

// L1.40's done-when: the journey author's four fixtures each make check fail naming the file; clean acme passes.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll } from "vitest";

// Dot-folders (.wrangler, .architect) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");
// The planted fixtures were written for implementation/handlers/<thing>/, three levels deep; src/<thing>/ is two.
const moved = (text: string) => text.replaceAll('"../../../', '"../../').replaceAll("/implementation/handlers/", "/src/");
const install = (from: string, root: string, to: string) => {
  if (!to.startsWith("src/") && !to.startsWith("generated/")) return cpSync(from, join(root, to));
  mkdirSync(dirname(join(root, to)), { recursive: true });
  writeFileSync(join(root, to), moved(readFileSync(from, "utf8")));
};

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = join(acme, "test/tmp/check");

/** A copy of acme, named acme (the folder names the project), with `installs` laid over it. */
const copy = (name: string, installs: ReadonlyArray<readonly [string, string]>) => {
  const root = join(scratch, name, "acme");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({
    extends: relative(root, join(acme, "tsconfig.json")),
    include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"],
  }));
  for (const [from, to] of installs) install(join(acme, from), root, to);
  return root;
};
const checked = (root: string) => Effect.runPromise(Check.run(root));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("architect check on acme", () => {
  it("passes clean acme with ratchets 0", { timeout: 180_000 }, async () => {
    const said = await checked(copy("clean", []));
    expect(said.lines).toEqual(["blanks left 0", "types ✔", "rules ✔", "drift ✔", "ratchets 0", "check ✔"]);
    expect(said.passed).toBe(true);
  });

  it("lets a ratchet allow a rule's findings, and asks for it to be lowered once they are gone", { timeout: 180_000 }, async () => {
    const root = copy("ratchet", [["test/fixtures/check/name-as-string/spend.ts", "src/allowance/spend.ts"]]);
    mkdirSync(join(root, ".architect"), { recursive: true });
    writeFileSync(join(root, ".architect/ratchets.json"), JSON.stringify({ "no-name-as-string": 1 }));
    const allowed = await checked(root);
    expect([allowed.passed, allowed.lines.includes("ratchets 1")]).toEqual([true, true]);
    cpSync(join(acme, "src/allowance/spend.ts"), join(root, "src/allowance/spend.ts"));
    expect((await checked(root)).lines).toContain("  no-name-as-string allows 1 but has 0: lower it");
  });

  const spend = "src/allowance/spend.ts";
  const fixtures = [
    ["edited-output", "check/edited-output/get.ts", "generated/api/src/allowance/get.ts", "drift ✘", "no-edited-output"],
    ["name-as-string", "check/name-as-string/spend.ts", spend, "rules ✘", "no-name-as-string"],
    ["undeclared-error", "types/undeclared-error/spend.ts", spend, "types ✘", "TS"],
    ["refusal-without-log", "check/refusal-without-log/spend.ts", spend, "rules ✘", "refusal-has-log"],
  ] as const;
  for (const [name, fixture, over, part, rule] of fixtures) {
    it(`fails on ${name}, naming ${over}`, { timeout: 180_000 }, async () => {
      const said = await checked(copy(name, [[`test/fixtures/${fixture}`, over]]));
      expect(said.passed).toBe(false);
      expect(said.lines.at(-1)).toBe("check ✘");
      expect(said.lines.some((l) => l.startsWith(part))).toBe(true);
      expect(said.lines.some((l) => l.includes(over) && l.includes(rule)), said.lines.join("\n")).toBe(true);
    });
  }
});
