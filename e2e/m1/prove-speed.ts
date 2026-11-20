// What checks 29 (ST1.23, `ortho prove --changed`) and 30 (ST1.24, a warm world) share: running prove as a user does, reading
// what it says as data, the set of journeys a change affects worked out from the model (never from prove's output), and the
// instruments that judge a run. Written by the checks author; a builder never edits it (AGENTS.md, "Journeys and checks come first").
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { cli } from "../layer1/support.ts";

// ---- prove's report, as `--report <file>` writes it (the existing `ProveReport`, plus ST1.23's `changed`) ----

export interface Changed {
  readonly base: string;
  readonly rerun: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<string>;
  readonly fellBack: null | { readonly reason: string; readonly files: ReadonlyArray<string> };
}
export interface Report {
  readonly passed: boolean;
  readonly journeys: ReadonlyArray<{ readonly name: string; readonly verdict: string; readonly steps: ReadonlyArray<{ readonly name: string; readonly verdict: string }> }>;
  readonly lines: ReadonlyArray<string>;
  readonly changed?: Changed;
}
export interface Proved {
  readonly status: number | null;
  readonly out: string;
  readonly report: Report | undefined;
  readonly seconds: number;
  /** The operations that really ran in the world, read from the spans the run's collector wrote (a recording, not prove's own word). */
  readonly called: ReadonlySet<string>;
  /** Every wrangler or workerd process of this project that was not already running when prove started, as the poll saw them (see `worldProcesses`). */
  readonly worlds: ReadonlySet<string>;
}

/** `ortho prove <args> --root <root> --report <file>`, run as a user runs it, asynchronously, watching what it starts. */
export const prove = async (root: string, ...args: ReadonlyArray<string>): Promise<Proved> => {
  const file = join(dirname(root), `report-${Math.random().toString(36).slice(2)}.json`);
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root, "--report", file], { cwd: root });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const worlds = new Set<string>();
  const spans = join(root, ".ortho/prove-telemetry/traces.jsonl");
  const offset = existsSync(spans) ? statSync(spans).size : 0;
  const before = new Set(worldProcesses(root).map(pidOf));
  const started = Date.now();
  let open = true;
  const done = new Promise<number | null>((resolve) => child.once("close", (code) => { open = false; resolve(code); }));
  while (open) {
    for (const line of worldProcesses(root)) if (!before.has(pidOf(line))) worlds.add(line);
    await new Promise((r) => setTimeout(r, 120));
  }
  const status = await done;
  const report = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Report) : undefined;
  return { status, out, report, seconds: (Date.now() - started) / 1000, worlds, called: operationsCalled(root, offset) };
};

/** The operations (by the model's names) that have a span in the collector's file past `offset` bytes: what the world was really asked to do. */
const operationsCalled = (root: string, offset: number): ReadonlySet<string> => {
  const file = join(root, ".ortho/prove-telemetry/traces.jsonl");
  if (!existsSync(file) || !existsSync(join(root, "generated/model/model.json"))) return new Set();
  const known = new Set(Object.keys((JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: object }).operations));
  const found = new Set<string>();
  for (const line of readFileSync(file).subarray(offset).toString("utf8").split("\n")) {
    if (line === "") continue;
    // The collector writes whole lines, but the file may be read as one is being written, or from the middle of one.
    const parsed = Effect.runSync(Effect.try(() => JSON.parse(line)).pipe(Effect.orElseSucceed(() => ({})))) as { resourceSpans?: ReadonlyArray<{ scopeSpans?: ReadonlyArray<{ spans?: ReadonlyArray<{ name: string }> }> }> };
    for (const r of parsed.resourceSpans ?? []) for (const sc of r.scopeSpans ?? []) for (const sp of sc.spans ?? []) if (known.has(sp.name)) found.add(sp.name);
  }
  return found;
};

const pidOf = (line: string) => line.split(/\s+/)[0]!;
/** `pid command` of every wrangler or workerd process whose command line names this project's folder (a unique temp folder). */
export const worldProcesses = (root: string): ReadonlyArray<string> => {
  const token = dirname(root).split("/").pop()!;
  const listed = spawnPs();
  return listed.filter((line) => line.includes(token) && /workerd|wrangler/.test(line)).map((line) => line.trim());
};
const spawnPs = () => spawnSync("ps", ["-axo", "pid=,command="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout.split("\n");

// ---- the model, and what a change affects, worked out without prove ----

interface ModelJourney { readonly name: string; readonly starts: string | null; readonly steps: ReadonlyArray<{ readonly call?: { readonly operation: string } }> }
interface ModelWorld { readonly from: string | null; readonly makes: ReadonlyArray<{ readonly operation: string } | null> }
export interface JourneyMap {
  readonly journeys: Record<string, ModelJourney>;
  readonly startingWorlds: Record<string, ModelWorld>;
}
export const modelOf = (root: string): JourneyMap => JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as JourneyMap;

/** Every operation a journey's proof rests on: its own steps' calls, and the calls of the starting worlds it stands on, oldest first. */
export const callsOf = (map: JourneyMap, name: string): ReadonlySet<string> => {
  const journey = Object.values(map.journeys).find((j) => j.name === name)!;
  const calls = new Set(journey.steps.flatMap((s) => (s.call ? [s.call.operation] : [])));
  const seen = new Set<string>();
  for (let world = journey.starts; world !== null && !seen.has(world);) {
    seen.add(world);
    const w = map.startingWorlds[world];
    if (!w) break;
    for (const call of w.makes) if (call) calls.add(call.operation);
    world = w.from;
  }
  return calls;
};
/** Only what the starting worlds a journey stands on make: answered whatever the journey does after. */
export const worldCallsOf = (map: JourneyMap, name: string): ReadonlySet<string> => {
  const journey = Object.values(map.journeys).find((j) => j.name === name)!;
  const calls = new Set<string>();
  const seen = new Set<string>();
  for (let world = journey.starts; world !== null && !seen.has(world);) {
    seen.add(world);
    const w = map.startingWorlds[world];
    if (!w) break;
    for (const call of w.makes) if (call) calls.add(call.operation);
    world = w.from;
  }
  return calls;
};
export const journeyNames = (map: JourneyMap) => Object.values(map.journeys).map((j) => j.name).sort();
/** The journeys that call (in a step or through a starting world) at least one of these operations. */
export const calling = (map: JourneyMap, ...operations: ReadonlyArray<string>) =>
  journeyNames(map).filter((name) => operations.some((op) => callsOf(map, name).has(op)));

// ---- the judge: what a `--changed` run must say, as a list of problems (empty when it is right) ----

export interface Expected {
  /** Exactly the journeys that must run. */
  readonly ran: ReadonlyArray<string>;
  /** `null`: it can tell. Otherwise the files it cannot place, which it must name: it proves everything. */
  readonly fellBackOn: null | ReadonlyArray<string>;
  /** What the reason it gives must say, when it falls back. */
  readonly reason?: RegExp;
  readonly all: ReadonlyArray<string>;
  /** The model, for the operations the run may and must have called. */
  readonly map: JourneyMap;
  /** Whether everything it reruns passes (a planted comment does; a planted break does not). */
  readonly passes: boolean;
}
const sorted = (xs: ReadonlyArray<string>) => [...xs].sort();
const same = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

/**
 * The check ST1.23 holds a run to. The expected sets come from the model (`calling`), never from the output judged. Each rule is
 * judged on its own, so a run that runs everything, nothing, one too many, one too few or the right count of the wrong ones
 * each earn a problem of their own (check 29's controls plant each).
 */
export const problems = (run: Pick<Proved, "status" | "out" | "report" | "called">, want: Expected): ReadonlyArray<string> => {
  const found: Array<string> = [];
  const { report, out } = run;
  if (report === undefined) return ["no report was written: prove did not run"];
  const skipped = sorted(want.all.filter((name) => !want.ran.includes(name)));
  const ran = report.journeys.map((j) => j.name);
  if (!same(ran, want.ran) || new Set(ran).size !== ran.length) found.push(`ran ${JSON.stringify(sorted(ran))}, expected exactly ${JSON.stringify(sorted(want.ran))}`);
  const changed = report.changed;
  if (changed === undefined) return [...found, "the report has no `changed` section"];
  if (!same(changed.rerun, want.ran)) found.push(`changed.rerun is ${JSON.stringify(sorted(changed.rerun))}, expected ${JSON.stringify(sorted(want.ran))}`);
  if (!same(changed.skipped, skipped)) found.push(`changed.skipped is ${JSON.stringify(sorted(changed.skipped))}, expected ${JSON.stringify(skipped)}`);
  if (typeof changed.base !== "string" || changed.base === "") found.push("changed.base names no base");
  // Every journey the run skipped is named in the text a person reads, one line each, and no other journey is.
  const said = [...out.matchAll(/^journey (.+?) skipped\b.*$/gm)].map((m) => m[1]!);
  if (!same(said, skipped) || new Set(said).size !== said.length) found.push(`the text names skipped ${JSON.stringify(sorted(said))}, expected ${JSON.stringify(skipped)}, once each`);
  const headline = out.match(/^prove --changed: (.+)$/m)?.[1];
  if (want.fellBackOn === null) {
    if (changed.fellBack !== null) found.push(`it fell back to everything (${JSON.stringify(changed.fellBack)}) where it could tell`);
    if (!/^proving \d+ of \d+ journeys\b/.test(headline ?? "") || headline!.match(/\d+/g)!.join("/") !== `${want.ran.length}/${want.all.length}`) found.push(`headline is ${JSON.stringify(headline)}, expected "proving ${want.ran.length} of ${want.all.length} journeys"`);
  } else {
    const fell = changed.fellBack;
    if (fell === null) found.push("it did not say it fell back to everything");
    else {
      if (!same(fell.files, want.fellBackOn)) found.push(`fellBack.files is ${JSON.stringify(sorted(fell.files))}, expected ${JSON.stringify(sorted(want.fellBackOn))}`);
      if (!(want.reason ?? /cannot place/).test(fell.reason)) found.push(`fellBack.reason is ${JSON.stringify(fell.reason)}, expected it to match ${want.reason ?? /cannot place/}`);
      for (const file of want.fellBackOn) if (!out.includes(file)) found.push(`the text does not name ${file}`);
    }
    if (!/^proving all \d+ journeys: .+/.test(headline ?? "") || !headline!.includes(`all ${want.all.length} journeys`)) found.push(`headline is ${JSON.stringify(headline)}, expected "proving all ${want.all.length} journeys: <why>"`);
    if (said.length > 0) found.push("it fell back to everything and still names skipped journeys");
  }
  // What the world was really asked: nothing outside what the journeys it ran call, and every call their starting worlds make.
  const may = new Set(want.ran.flatMap((name) => [...callsOf(want.map, name)]));
  const must = new Set(want.ran.flatMap((name) => [...worldCallsOf(want.map, name)]));
  for (const op of run.called) if (!may.has(op)) found.push(`the world was asked to run ${op}, which no journey it ran calls`);
  for (const op of must) if (!run.called.has(op)) found.push(`the world was never asked to run ${op}, which a starting world of the journeys it ran makes`);
  if ((run.status === 0) !== want.passes || report.passed !== want.passes) found.push(`exit ${run.status}, passed ${report.passed}, expected ${want.passes ? "pass" : "fail"}`);
  return found;
};

/** A report and its text that `problems` accepts, for the controls to plant a wrong output into. */
export const perfect = (want: Expected): Pick<Proved, "status" | "out" | "report" | "called"> & { readonly report: Report } => {
  const skipped = want.all.filter((name) => !want.ran.includes(name));
  const why = want.fellBackOn !== null && want.fellBackOn.length === 0 ? "no record of an earlier prove" : `cannot place ${(want.fellBackOn ?? []).join(", ")}`;
  const fell = want.fellBackOn === null ? null : { reason: why, files: [...want.fellBackOn] };
  const headline = fell ? `prove --changed: proving all ${want.all.length} journeys: ${fell.reason}` : `prove --changed: proving ${want.ran.length} of ${want.all.length} journeys`;
  const out = [headline, ...skipped.map((name) => `journey ${name} skipped: nothing it calls changed`), ...want.ran.map((name) => `journey ${name} ✔ 1/1 steps`), "prove ✔"].join("\n");
  const verdict = want.passes ? "pass" : "fail";
  const report: Report = {
    passed: want.passes, lines: out.split("\n"),
    journeys: want.ran.map((name) => ({ name, verdict, steps: [{ name: "a step", verdict }] })),
    changed: { base: "last proof", rerun: [...want.ran], skipped, fellBack: fell },
  };
  const called = new Set(want.ran.flatMap((name) => [...callsOf(want.map, name)]));
  return { status: want.passes ? 0 : 1, out, report, called };
};

// ---- planting a change in a copy ----

export const edit = (root: string, path: string, change: (text: string) => string) => {
  const file = join(root, path);
  const before = readFileSync(file, "utf8");
  const after = change(before);
  if (after === before) throw new Error(`the planted change did not change ${path}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, after);
};
export const append = (root: string, path: string, text: string) => edit(root, path, (before) => before + text);
