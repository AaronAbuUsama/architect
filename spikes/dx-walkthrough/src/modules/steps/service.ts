// Plugged In made from nothing: each planned step run for real in the project folder, its output and files kept.
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { clear, match, snapshot } from "./internal/files.ts";
import { PLAN, type Planned } from "./internal/plan.ts";
import { readTraces } from "./internal/spans.ts";
import type { FileAt, Run, Step, Steps, StepsInput, Trace } from "./types.ts";

/** The files around the blueprint that, inside this repository, must be the draft's for the workspace to resolve. */
const INFRA = ["package.json", "tsconfig.json", "project.json"];

const lines = (out: string): ReadonlyArray<string> => out.replace(/\s+$/, "").split("\n");

export const runSteps = (input: StepsInput, expected: ReadonlyMap<string, string>): Steps => {
  const { projectDir: dir, draftDir: draft, name, tools } = input;
  const blobs: Array<string> = [];
  const blobIndex = new Map<string, number>();
  const blob = (content: string) => {
    if (!blobIndex.has(content)) blobIndex.set(content, blobs.push(content) - 1);
    return blobIndex.get(content)!;
  };
  const problems: Array<string> = [];
  let traces: ReadonlyArray<Trace> = [];
  let before: ReadonlyMap<string, string> = new Map();

  const ortho = (args: ReadonlyArray<string>): Run => {
    const t = tools.now();
    const r = tools.ortho(dir, args);
    return { command: `pnpm ortho ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`, out: lines(r.out), exit: r.exit, millis: Math.round(tools.now() - t) };
  };

  const act = (p: Planned): ReadonlyArray<Run> => {
    if (p.preset) {
      clear(dir);
      const t = tools.now();
      const wrote = tools.preset(dir, name);
      const millis = Math.round(tools.now() - t);
      for (const f of INFRA) match(dir, draft, f);
      rmSync(join(dir, "pnpm-workspace.yaml"), { force: true });
      return [{ command: `npx create-nx-workspace ${name} --preset=@orthograph/preset`, out: [...wrote.map((w) => `CREATE ${w}`), "", "(the install that follows is skipped here: the workspace's packages are already linked)"], exit: 0, millis }];
    }
    for (const part of p.copy ?? []) match(dir, draft, part);
    if (p.id === "prove") rmSync(join(dir, ".ortho"), { recursive: true, force: true });
    const claim = () => traces.find((t) => t.operation === "handle.claim" && !t.refusal)?.id ?? "";
    const runs = (p.commands ?? []).map((args) => ortho(args.map((a) => (a === "{claim}" ? claim() : a))));
    if (p.id === "prove") traces = readTraces(join(dir, ".ortho/prove-telemetry/traces.jsonl"));
    return runs;
  };

  const steps = PLAN.map((p): Step => {
    const runs = act(p);
    for (const r of runs) if (r.exit !== 0 && !(p.id === "check-gaps" || p.id === "check-handlers")) problems.push(`${p.id}: \`${r.command}\` exited ${r.exit}: ${r.out.slice(-3).join(" / ")}`);
    const now = snapshot(dir);
    const added = [...now.keys()].filter((k) => !before.has(k));
    const changed = [...now.keys()].filter((k) => before.has(k) && before.get(k) !== now.get(k));
    const removed = [...before.keys()].filter((k) => !now.has(k));
    const files: ReadonlyArray<FileAt> = [...now.entries()].map(([path, content]) => [path, blob(content)]);
    if (p.id === "generate") {
      const differ = [...expected.entries()].filter(([path, content]) => now.get(path) !== content).map(([path]) => path);
      if (differ.length > 0) problems.push(`generate: ${differ.length} files differ from the traced render, e.g. ${differ.slice(0, 3).join(", ")}`);
    }
    before = now;
    const open = p.open && now.has(p.open) ? p.open : added[0] ?? changed[0];
    return {
      id: p.id,
      title: p.title,
      caption: p.caption,
      kind: p.kind,
      ...(p.who ? { who: p.who } : {}),
      runs,
      ...(p.note ? { note: p.note } : {}),
      files,
      added,
      changed,
      removed,
      ...(open ? { open } : {}),
    };
  });
  if (!existsSync(join(dir, "generated"))) problems.push("the steps ended with no generated/ folder");
  if (traces.length === 0) problems.push("prove wrote no traces");
  return { steps, blobs, traces, problems };
};
