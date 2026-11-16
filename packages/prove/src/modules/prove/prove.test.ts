// The stage-one gate for prove: acme passes, and each planted fixture (written by the journey author, never by the
// builder) fails its own eval in a scratch copy of acme.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { FsTree, flushChanges } from "nx/src/generators/tree.js";
import { Sync } from "@architect/generators/sync";
import { Prove } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const fixtures = join(acme, "test/fixtures/evals");
const scratch = join(acme, "test/tmp");

const prove = (root: string, port: number) => Effect.runPromise(Effect.scoped(Prove.run({ root, port })));

/** A copy of acme with the fixture's files installed where its README says, and generated/ synced if it must be. */
const planted = (name: string, installs: ReadonlyArray<readonly [string, string]>, sync = false, unwritten = false) =>
  Effect.runPromise(Effect.gen(function* () {
    const root = join(scratch, name, "acme");
    rmSync(join(scratch, name), { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const part of ["blueprint", "generated", "implementation", "journeys", "package.json"]) {
      cpSync(join(acme, part), join(root, part), { recursive: true });
    }
    // acme's own compiler options, from where the copy sits.
    writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
    for (const [from, to] of installs) cpSync(join(fixtures, name, from), join(root, to));
    // Sync scaffolds every handler that isn't there: a project whose handlers are all still blank.
    if (unwritten) rmSync(join(root, "implementation/handlers"), { recursive: true, force: true });
    if (sync) {
      const tree = new FsTree(repo, false);
      yield* Sync.project(tree, relative(repo, root));
      flushChanges(repo, tree.listChanges());
    }
    return root;
  }));

const GRANT = "implementation/handlers/allowance/grant.ts";
const nothingRunning = () => {
  const containers = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" }).stdout;
  expect(containers).not.toContain("architect-collector");
};

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("architect prove --env local", () => {
  it("passes on acme: every journey, every eval, coverage, and leaves nothing running", { timeout: 180_000 }, async () => {
    const report = await prove(acme, 8800);
    expect(report.lines).toContain("journey grant an allowance ✔ 3/3 steps");
    for (const j of ["an outsider cannot revoke", "read an allowance", "revoke then spend", "spend twice with one request", "spend within an allowance"]) {
      expect(report.lines.some((l) => l.startsWith(`journey ${j} ✔`))).toBe(true);
    }
    for (const op of ["allowance.get", "allowance.grant", "allowance.revoke", "allowance.spend", "organization.create"]) {
      expect(report.lines.some((l) => l.startsWith(`${op} 9 evals ✔ p50 `))).toBe(true);
    }
    expect(report.lines.some((l) => l.startsWith("allowance.grant performance ✔ p50 "))).toBe(true);
    expect(report.lines).toContain("coverage ✔ moves 3/3 · outcomes 3/3 · refusals 2/2 · runtime refusals 4/7");
    expect(report.lines.at(-1)).toBe("prove ✔");
    expect(report.passed).toBe(true);
    nothingRunning();
  });

  it("the who-may-call fixture is still the generated server with only its gate removed", () => {
    // The author regenerates it from generated/server/main.ts; if the generator moves on, this says so.
    const fixture = readFileSync(join(fixtures, "who-may-call/main.ts"), "utf8").split("\n");
    const generated = new Set(readFileSync(join(acme, "generated/server/main.ts"), "utf8").split("\n"));
    const different = fixture.filter((line) => !generated.has(line));
    expect(different.length).toBeLessThanOrEqual(5);
    expect(different.some((l) => l.includes("allowed: [Blueprint.anyone]"))).toBe(true);
  });

  const cases: ReadonlyArray<{ readonly fixture: string; readonly installs: ReadonlyArray<readonly [string, string]>; readonly line: string; readonly says: string; readonly sync?: boolean }> = [
    { fixture: "answer-shape", installs: [["grant.ts", GRANT]], line: "allowance.grant answer shape ✘", says: 'grant-an-allowance "ada grants olga 500": answer.allowance: expected alw_<id>, got 500' },
    { fixture: "declared-errors", installs: [["grant.ts", GRANT]], line: "allowance.grant declared errors ✘", says: "refused with AllowanceMemberUnknown, not one of AllowanceLimitTooHigh, NotAllowed" },
    { fixture: "machine-path", installs: [["grant.ts", GRANT]], line: "allowance.grant machine path ✘", says: 'grant ended in "paused", not one of active' },
    { fixture: "events", installs: [["grant.ts", GRANT]], line: "allowance.grant events ✘", says: "move grant emitted no AllowanceGranted" },
    { fixture: "who-may-call", installs: [["main.ts", "generated/server/main.ts"]], line: "allowance.grant who may call ✘", says: "and was answered, not refused" },
    { fixture: "steps", installs: [["grant.ts", GRANT]], line: "allowance.grant steps ✘", says: "declared step allowance.grant.insert ran no span" },
    { fixture: "coverage", installs: [["rename.ts", "blueprint/things/organization/verbs/rename.ts"], ["rename.handler.ts", "implementation/handlers/organization/rename.ts"]], line: "organization.rename coverage ✘", says: "organization.rename reached by no journey", sync: true },
    { fixture: "explainability", installs: [["grant.ts", GRANT]], line: "allowance.grant explainability ✘", says: '"a limit over the cap is refused": AllowanceLimitTooHigh has no deciding log' },
  ];

  it("fails on the scaffolded handlers: the starting world can't be made, so no step runs", { timeout: 120_000 }, async () => {
    const report = await prove(await planted("scaffolded", [], true, true), 8799);
    expect(report.lines[0]).toMatch(/^journey grant an allowance ✘ starting world founded: organization.create died: .*BlankReached/);
    expect(report.passed).toBe(false);
    nothingRunning();
  });

  cases.forEach((c, i) =>
    it(`fails the planted ${c.fixture} fixture on its own eval`, { timeout: 120_000 }, async () => {
      expect(existsSync(join(fixtures, c.fixture))).toBe(true);
      const report = await prove(await planted(c.fixture, c.installs, c.sync), 8801 + i);
      expect(report.passed).toBe(false);
      expect(report.lines.filter((l) => l.startsWith(c.line)).join("\n")).toContain(c.says);
      expect(report.lines.at(-1)).toMatch(/^prove ✘/);
      nothingRunning();
    }),
  );
});
