// `prove --changed`'s selection, from a record and today's files: what it reruns, what it skips, when it cannot tell.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { select, settle } from "./internal/changed.ts";

const A = "journeys/a.ts";
const B = "journeys/b.ts";
const operation = (name: string, verb: string, calls: ReadonlyArray<string> = []) => ({
  kind: "operation", name, thing: "box", verb, file: `blueprint/things/box/verbs/${verb}.ts`, from: { kind: "app" }, runs: "server", hash: name,
  payload: {}, answer: {}, allowed: [],
  steps: Object.fromEntries(calls.map((mount) => [mount, { call: { mount, call: "quote", mode: "effect" } }])),
});
const journey = (file: string, name: string, calls: ReadonlyArray<string>) => ({ file, name, starts: null, steps: calls.map((call) => ({ title: call, call: { operation: call }, checks: [] })) });
const modelOf = (mounts: Record<string, unknown> = {}, names: readonly [string, string] = ["a", "b"]) => ({
  operations: { "box.open": operation("box.open", "open", Object.keys(mounts)), "box.shut": operation("box.shut", "shut") },
  journeys: { [A]: journey(A, names[0], ["box.open"]), [B]: journey(B, names[1], ["box.shut"]) },
  startingWorlds: {}, things: {}, mounts,
}) as unknown as Model;
const model = modelOf();

const roots: Array<string> = [];
const project = () => {
  const root = mkdtempSync(join(tmpdir(), "changed-"));
  roots.push(root);
  for (const file of ["blueprint/things/box/verbs/open.ts", "blueprint/things/box/verbs/shut.ts", "src/box/open.ts", "src/box/shut.ts", A, B]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), `// ${file}\n`);
  }
  writeFileSync(join(root, "package.json"), "{}\n");
  return root;
};
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

const proven = (root: string, of: Model = model) => settle(root, of, undefined, {
  journeys: [{ file: A, passed: true }, { file: B, passed: true }],
  operations: [{ operation: "box.open", passed: true }, { operation: "box.shut", passed: true }],
});

describe("select", () => {
  it("says there is no record when there is none", () => {
    expect(select(project(), model, undefined).fellBack).toEqual({ reason: "no record of an earlier prove", files: [] });
  });

  it("reruns nothing when nothing changed", () => {
    const root = project();
    expect(select(root, model, proven(root))).toEqual({ rerun: [], skipped: [A, B], judge: [], fellBack: null });
  });

  it("reruns the journeys that call an operation whose handler changed, and judges its evals", () => {
    const root = project();
    const record = proven(root);
    writeFileSync(join(root, "src/box/open.ts"), "// changed\n");
    expect(select(root, model, record)).toEqual({ rerun: [A], skipped: [B], judge: ["box.open"], fellBack: null });
  });

  it("reruns a changed journey alone, without judging any evals", () => {
    const root = project();
    const record = proven(root);
    writeFileSync(join(root, B), "// changed\n");
    expect(select(root, model, record)).toEqual({ rerun: [B], skipped: [A], judge: [], fellBack: null });
  });

  it("proves everything, naming the files, when one it cannot place changed or is new", () => {
    const root = project();
    const record = proven(root);
    writeFileSync(join(root, "package.json"), "{ }\n");
    writeFileSync(join(root, "src/box/helper.ts"), "export {};\n");
    expect(select(root, model, record).fellBack).toEqual({ reason: "cannot place package.json, src/box/helper.ts", files: ["package.json", "src/box/helper.ts"] });
  });

  it("keeps a failure until it passes: a journey and an operation that did not pass are rerun", () => {
    const root = project();
    const record = settle(root, model, undefined, { journeys: [{ file: A, passed: false }, { file: B, passed: true }], operations: [{ operation: "box.open", passed: false }, { operation: "box.shut", passed: true }] });
    expect(select(root, model, record)).toEqual({ rerun: [A], skipped: [B], judge: ["box.open"], fellBack: null });
  });

  it("reruns the callers of an operation when an adapter it calls changed (its mount hash), though no file did", () => {
    const root = project();
    const before = modelOf({ pricing: { kind: "adapter", hash: "v1" } });
    const record = proven(root, before);
    expect(select(root, before, record).rerun).toEqual([]);
    expect(select(root, modelOf({ pricing: { kind: "adapter", hash: "v2" } }), record)).toEqual({ rerun: [A], skipped: [B], judge: ["box.open"], fellBack: null });
  });

  it("tracks two journeys that share a name apart: editing the first reruns it and not the other", () => {
    const root = project();
    const same = modelOf({}, ["twin", "twin"]);
    const record = proven(root, same);
    writeFileSync(join(root, A), "// changed\n");
    expect(select(root, same, record)).toEqual({ rerun: [A], skipped: [B], judge: [], fellBack: null });
    expect(Object.keys(record.journeys)).toEqual([A, B]);
  });
});
