#!/usr/bin/env node
// The climb recorder (Goal 3, loop step 2): runs `ortho prove` with the arguments given, streams its output unchanged, and
// appends one JSON line per journey to design/evidence/climb/runs.jsonl, taken from prove's own report (`--report`, a
// `ProveReport` with schemaVersion 1) and never retyped:
//   { at, commit, journey, green, total, seconds, run_seconds, exit }
// `seconds` is the journey's own time as prove measured it; `run_seconds` the whole prove run, world start included.
//   node tools/climb/record.mjs --root examples/plugged-in --only "claim a free handle" [--runs <file>]
// `--runs` is this tool's own option (default design/evidence/climb/runs.jsonl); everything else goes to `ortho prove`.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { entries } from "./parse.mjs";

const repo = resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);
const at = args.indexOf("--runs");
const runs = resolve(at < 0 ? resolve(repo, "design/evidence/climb/runs.jsonl") : args[at + 1]);
const prove = at < 0 ? args : args.filter((_, i) => i !== at && i !== at + 1);

const folder = mkdtempSync(join(tmpdir(), "ortho-climb-"));
const reportFile = join(folder, "report.json");
const started = new Date().toISOString();
const commit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();
const child = spawn(process.execPath, [resolve(repo, "packages/cli/src/main.ts"), "prove", ...prove, "--report", reportFile], { stdio: ["inherit", "inherit", "inherit"] });
// An interrupted climb must stop prove too, so its workerd and collector are released by prove's own cleanup.
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child.kill(signal); });
child.on("close", (exit) => {
  const report = JSON.parse(readFileSync(reportFile, "utf8"));
  rmSync(folder, { recursive: true, force: true });
  const lines = entries({ report, at: started, commit, exit });
  if (lines.length > 0) {
    mkdirSync(dirname(runs), { recursive: true });
    appendFileSync(runs, lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
  }
  process.stderr.write(`recorded ${lines.length} journey line(s) in ${runs}\n`);
  process.exit(exit ?? 1);
});
