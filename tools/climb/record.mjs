#!/usr/bin/env node
// The climb recorder (Goal 3, loop step 2): runs `ortho prove` with the arguments given, streams its output unchanged, and
// appends one JSON line per journey to design/evidence/climb/runs.jsonl, taken from prove's own output and never retyped:
//   { at, commit, journey, green, total, seconds, exit }
// `seconds` is the whole prove process (world start included); with `--only <journey>` it is that journey's run.
//   node tools/climb/record.mjs --root examples/plugged-in --only "claim a free handle" [--runs <file>]
// `--runs` is this tool's own option (default design/evidence/climb/runs.jsonl); everything else goes to `ortho prove`.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { entries } from "./parse.mjs";

const repo = resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);
const at = args.indexOf("--runs");
const runs = resolve(at < 0 ? resolve(repo, "design/evidence/climb/runs.jsonl") : args[at + 1]);
const prove = at < 0 ? args : args.filter((_, i) => i !== at && i !== at + 1);

const started = new Date().toISOString();
const commit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();
const t0 = performance.now();
const child = spawn(process.execPath, [resolve(repo, "packages/cli/src/main.ts"), "prove", ...prove], { stdio: ["inherit", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", (d) => { output += d; process.stdout.write(d); });
child.stderr.on("data", (d) => { output += d; process.stderr.write(d); });
child.on("close", (exit) => {
  const seconds = Math.round(((performance.now() - t0) / 1000) * 10) / 10;
  const lines = entries({ output, at: started, commit, seconds, exit });
  if (lines.length > 0) {
    mkdirSync(dirname(runs), { recursive: true });
    appendFileSync(runs, lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
  }
  process.stderr.write(`recorded ${lines.length} journey line(s) in ${runs}\n`);
  process.exit(exit ?? 1);
});
