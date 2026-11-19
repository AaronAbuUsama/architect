// Check 19 (M1.44, M1.45; design/decisions/K16-the-scaffold-explains-itself.md): the scaffold reads the machine and
// explains itself, every path through a machine gets a journey stub, and `ortho check` says when the blueprint grew
// past a handler that is already yours. Written by the ✍️ author before the build; a builder never edits it, nor
// e2e/fixtures/m1/scaffold-explains/.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, fixtures, removeAt, run, succeeds, textAt } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
const fresh = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  return copy.root;
};
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const golden = join(fixtures, "scaffold-explains");
const spend = "src/allowance/spend.ts";
const typed = (root: string) => spawnSync(join(root, "node_modules/.bin/tsc"), ["--noEmit"], { cwd: root, encoding: "utf8" });
const edit = (root: string, path: string, from: string, to: string) => {
  const before = textAt(root, path);
  const after = before.replace(from, to);
  expect(after, `${path} no longer holds ${from}`).not.toBe(before);
  writeFileSync(join(root, path), after);
};
const warnings = (out: string) => out.split("\n").filter((l) => /^\s*warning:/.test(l));

const STUBS = [
  "allowance-grant-created-in-active", "allowance-spend-active-to-active", "allowance-spend-active-to-exhausted",
  "allowance-spend-refused-from-exhausted", "allowance-spend-refused-from-revoked", "allowance-revoke-active-to-revoked",
  "allowance-revoke-exhausted-to-revoked", "allowance-revoke-refused-from-revoked",
].map((name) => `blueprint/journeys/${name}.ts`);

describe("M1.44: the scaffold explains itself", () => {
  it("ortho generate writes allowance.spend's scaffold exactly as the golden, and it compiles", () => {
    const root = fresh();
    removeAt(root, spend);
    succeeds(root, "generate");
    expect(textAt(root, spend)).toBe(readFileSync(join(golden, "allowance-spend.ts.golden"), "utf8"));
    const tsc = typed(root);
    expect(tsc.status, tsc.stdout + tsc.stderr).toBe(0);
  });
});

describe("M1.45: one journey stub per path through the allowance's machine", () => {
  it("ortho add journeys allowance writes the eight stubs, three exactly as their goldens, and they compile", () => {
    const root = fresh();
    const added = succeeds(root, "add", "journeys", "allowance").out;
    for (const path of STUBS) expect(added, path).toContain(path);
    for (const file of readdirSync(join(golden, "journeys"))) {
      expect(textAt(root, `blueprint/journeys/${file.replace(/\.golden$/, "")}`), file).toBe(readFileSync(join(golden, "journeys", file), "utf8"));
    }
    const tsc = typed(root);
    expect(tsc.status, tsc.stdout + tsc.stderr).toBe(0);
  });

  it("never overwrites a stub that is yours: a second run writes nothing and names what is already there", () => {
    const root = fresh();
    succeeds(root, "add", "journeys", "allowance");
    const mine = "blueprint/journeys/allowance-spend-active-to-exhausted.ts";
    writeFileSync(join(root, mine), `${textAt(root, mine)}// mine now\n`);
    const again = run(root, "add", "journeys", "allowance");
    expect(again.status, again.out).not.toBe(0);
    expect(again.out).toMatch(/already there/);
    expect(textAt(root, mine)).toMatch(/\/\/ mine now\n$/);
  });

  it("the model and ortho check count every unfilled stub as blanks, and the model still compiles", () => {
    const root = fresh();
    succeeds(root, "add", "journeys", "allowance");
    const blanks = (JSON.parse(succeeds(root, "model", "--json").stdout) as { blanks?: Record<string, ReadonlyArray<string>> }).blanks ?? {};
    for (const path of STUBS) expect(Object.keys(blanks).some((k) => path.includes(k) || k.includes(path)), `${path} in the model's blanks`).toBe(true);
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(1);
    expect(checked.out).not.toMatch(/^model ✘/m);
    for (const path of STUBS) expect(checked.out, path).toMatch(new RegExp(`${path.replaceAll(".", "\\.")}:\\d+`));
  });
});

describe("M1.44: ortho check says when the blueprint grew past a handler that is yours", () => {
  it("control: a new required step on spend is named, as M1.26's warning already does", () => {
    const root = fresh();
    edit(root, "blueprint/things/allowance/verbs/spend.ts", "record: Blueprint.step.database() }", "record: Blueprint.step.database(), notify: Blueprint.step.database() }");
    succeeds(root, "generate");
    const out = succeeds(root, "check").out;
    expect(warnings(out).filter((l) => l.includes(spend) && l.includes("steps.notify")), out).toHaveLength(1);
  });

  it("a new outcome of spend's move that the handler never chooses is named, with the file", () => {
    const root = fresh();
    const machine = "blueprint/things/allowance/machine.ts";
    edit(root, machine, `states: ["active", "exhausted", "revoked"]`, `states: ["active", "exhausted", "revoked", "frozen"]`);
    edit(root, machine, `to: ["active", "exhausted"]`, `to: ["active", "exhausted", "frozen"]`);
    succeeds(root, "generate");
    const out = succeeds(root, "check").out;
    expect(warnings(out).filter((l) => l.includes(spend) && /\bfrozen\b/.test(l)), out).toHaveLength(1);
    expect(warnings(out).filter((l) => /\b(?:active|exhausted)\b/.test(l)), out).toEqual([]);
  });

  it("a new declared error on spend that the handler never refuses with is named, with the file", () => {
    const root = fresh();
    edit(root, "blueprint/things/allowance/errors.ts", "export class AllowanceNotFound", "export class AllowanceFrozen extends Blueprint.error({}, { exit: 45 }) {}\nexport class AllowanceNotFound");
    const verb = "blueprint/things/allowance/verbs/spend.ts";
    edit(root, verb, `import { AllowanceExceeded } from "../errors.ts";`, `import { AllowanceExceeded, AllowanceFrozen } from "../errors.ts";`);
    edit(root, verb, "errors: [AllowanceExceeded]", "errors: [AllowanceExceeded, AllowanceFrozen]");
    succeeds(root, "generate");
    const out = succeeds(root, "check").out;
    expect(warnings(out).filter((l) => l.includes(spend) && l.includes("AllowanceFrozen")), out).toHaveLength(1);
    expect(warnings(out).filter((l) => l.includes("AllowanceExceeded")), out).toEqual([]);
  });
});
