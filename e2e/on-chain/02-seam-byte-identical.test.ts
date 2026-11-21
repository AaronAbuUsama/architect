// Goal 4's done check, third line (`design/goals/04-on-chain.md`, "The done check": acme's and Plugged In's generated files are unchanged by
// the seam). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. For each of `examples/acme` and `examples/plugged-in`: in a copy outside the repository, with the copy's `generated/`
// removed, the real `ortho generate` writes a `generated/` that is the checked-in one byte for byte: the same files, none more, none fewer.
// It passes today and must keep passing: a chain seam that changed what a plain (non-chain) project generates fails it.
//
// THE CONTROLS plant each hollow reading against `treeProblems`: one byte changed in one file, a file missing, a file added, a folder with
// nothing in it on either side, and a trailing newline. Each must be refused.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme } from "../layer1/support.ts";
import { regenerateProblems, repo, treeProblems } from "./support.ts";

describe("controls: treeProblems refuses each hollow reading", () => {
  const dir = mkdtempSync(join(tmpdir(), "ortho-on-chain-tree-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const make = (name: string, files: Record<string, string>) => {
    for (const [f, text] of Object.entries(files)) { const p = join(dir, name, f); mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, text); }
    mkdirSync(join(dir, name), { recursive: true });
    return join(dir, name);
  };
  const base = { "a.ts": "one\n", "docs/b.md": "two\n" };
  it("accepts the same tree", () => expect(treeProblems(make("same-a", base), make("same-b", base))).toEqual([]));
  it("refuses one byte changed, a trailing newline lost, a file missing and a file added", () => {
    const want = make("want", base);
    expect(treeProblems(want, make("byte", { ...base, "a.ts": "onf\n" }))).toEqual(["a.ts differs"]);
    expect(treeProblems(want, make("nl", { ...base, "a.ts": "one" }))).toEqual(["a.ts differs"]);
    expect(treeProblems(want, make("less", { "a.ts": "one\n" }))).toEqual(["docs/b.md is checked in but not regenerated"]);
    expect(treeProblems(want, make("more", { ...base, "c.ts": "" }))).toEqual(["c.ts is regenerated but not checked in"]);
  });
  it("refuses an empty folder on either side", () => {
    expect(treeProblems(make("empty", {}), make("empty2", {}))).not.toEqual([]);
    expect(treeProblems(make("full", base), join(dir, "nowhere"))).not.toEqual([]);
    expect(treeProblems(join(dir, "nowhere"), make("full2", base))).not.toEqual([]);
  });
});

describe("regenerating changes nothing that is checked in", () => {
  it("examples/acme: generated/ is byte for byte what `ortho generate` writes", { timeout: 300_000 }, () => {
    const problems = regenerateProblems(acme);
    expect(problems, problems.join("\n")).toEqual([]);
  });
  it("examples/plugged-in: generated/ is byte for byte what `ortho generate` writes", { timeout: 300_000 }, () => {
    const problems = regenerateProblems(join(repo, "examples/plugged-in"));
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
