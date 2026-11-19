// The grid runner's entry and composition root: the only file that reads the process, touches the disk for the modules, or prints.
//
//   tsx e2e/grid/src/main.ts [run]                         judge every switched-on cell, write the verdicts, exit 1 if one is red
//   tsx e2e/grid/src/main.ts touched --journey "<name>" --report <prove output> [--write]
//                                                           the rows and cells a green journey touches; --write switches them on
//
// Options: --project <dir> (default examples/plugged-in), --list <file> (default e2e/grid/switched-on.json),
// --out <file> (default e2e/grid/out/verdicts.json), --observed <file> (the refused calls the client journeys recorded;
// default <project>/.ortho/grid/observed.json), --revision <sha> (default GITHUB_SHA, else git HEAD).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect } from "effect";
import { Portal, Wire } from "@orthograph/portal";
import { FileSource } from "@orthograph/prove";
import { Evidence } from "./modules/evidence/service.ts";
import type { Observed, Ports } from "./modules/evidence/types.ts";
import { Grid } from "./modules/grid/service.ts";
import type { CellId, List } from "./modules/grid/types.ts";
import { RefusalEvals } from "./modules/refusal-evals/service.ts";
import type { ModelView, RefusalEvidence, SpanView } from "./modules/refusal-evals/types.ts";
import { Touches } from "./modules/touches/service.ts";
import type { TouchModel } from "./modules/touches/types.ts";

const here = resolve(import.meta.dirname, "../..");
const repo = resolve(here, "..");
const argv = process.argv.slice(2);
const command = argv[0] !== undefined && !argv[0].startsWith("--") ? argv[0] : "run";
const option = (name: string) => { const at = argv.indexOf(`--${name}`); return at < 0 ? undefined : argv[at + 1]; };
const project = resolve(option("project") ?? join(repo, "examples/plugged-in"));
const listPath = resolve(option("list") ?? join(here, "grid/switched-on.json"));
const outPath = resolve(option("out") ?? join(here, "grid/out/verdicts.json"));
const say = (lines: ReadonlyArray<string>) => { for (const line of lines) process.stdout.write(`${line}\n`); };
const fail = (lines: ReadonlyArray<string>): never => { for (const line of lines) process.stderr.write(`${line}\n`); return process.exit(2); };

const text = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);
const readJson = <A>(path: string): A | undefined => { const t = text(path); return t === undefined ? undefined : (JSON.parse(t) as A); };

const loadList = (): List => {
  const found = text(listPath);
  if (found === undefined) return fail([`no list at ${listPath}`]);
  const parsed = Grid.parse(found);
  return parsed.ok ? parsed.value : fail([`${listPath} is not a valid list:`, ...parsed.problems.map((p) => `  ${p}`)]);
};

const loadModel = () => {
  const model = readJson<ModelView & TouchModel>(join(project, "generated/model/model.json"));
  return model ?? fail([`no generated/model/model.json in ${project}: run \`ortho generate\` there first`]);
};

const portalPort = async (route: string): Promise<string | undefined> => {
  const wire = readJson<unknown>(join(project, "generated/portal/blueprint.json"));
  if (wire === undefined) return undefined;
  const response = await Effect.runPromise(Wire.decode(wire).pipe(Effect.flatMap((blueprint) =>
    Portal.handle({ blueprint, reader: null, bundleRevision: null }, new Request(`http://portal.test${route}`)))));
  return response.status === 200 ? response.text() : undefined;
};

const spansPort = async (): Promise<ReadonlyArray<SpanView> | undefined> => {
  const dir = join(project, ".ortho/prove-telemetry");
  if (!existsSync(dir)) return undefined;
  const traces = await Effect.runPromise(FileSource.open(dir).window(30 * 24 * 3_600_000));
  return [...traces.values()].flatMap((trace) => trace.spans.map((span) => ({ name: span.name, attrs: span.attrs })));
};

const ports = (observedFile: string): Ports => ({
  read: async (path) => text(join(project, path)),
  portal: portalPort,
  spans: spansPort,
  observed: async (refusal) => readJson<Record<string, Observed>>(observedFile)?.[refusal],
});

const revision = () => option("revision") ?? process.env["GITHUB_SHA"] ?? spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();

const runCommand = async () => {
  const list = loadList();
  const model = loadModel();
  const observed = resolve(option("observed") ?? join(project, ".ortho/grid/observed.json"));
  // The error row's evidence is gathered once per refusal named in the list, then handed to the evals.
  const refusals = [...new Set(list.cells.filter((c) => c.cell.startsWith("error.")).flatMap((c) => c.subjects))];
  const gathered = new Map(await Promise.all(refusals.map(async (refusal) => [refusal, await Evidence.ofRefusal({ model, refusal, ports: ports(observed) })] as const)));
  const report = Grid.run<RefusalEvidence>({
    list, evals: RefusalEvals.evals, revision: revision(), environment: "local",
    evidence: (_cell, subject) => gathered.get(subject) ?? ({ model, docs: {}, portal: {}, spans: undefined, cli: undefined, mcp: undefined }),
  });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  say([...Grid.lines(report), `verdicts written to ${outPath}`]);
  process.exit(report.passed ? 0 : 1);
};

const touchedCommand = () => {
  const journey = option("journey");
  const reportFile = option("report");
  if (journey === undefined || reportFile === undefined) return fail(["touched needs --journey <name> and --report <file with prove's output>"]);
  const report = (text(resolve(reportFile)) ?? fail([`no prove output at ${reportFile}`])).split("\n");
  const touched = Touches.of({ model: loadModel(), journey, report });
  if (!touched.green) return fail(touched.problems);
  const cells = RefusalEvals.evals.map((e) => e.cell) as ReadonlyArray<CellId>;
  const entries = Touches.entries(touched, journey, cells);
  say([`journey "${journey}" touches:`, ...touched.rows.map((r) => `  ${r.block} ${r.subject}`), "cells with an eval to switch on:", ...entries.map((e) => `  ${e.cell}: ${e.subjects.join(", ")}`)]);
  if (argv.includes("--write")) {
    writeFileSync(listPath, `${JSON.stringify(Grid.switchOn(loadList(), entries), null, 2)}\n`);
    say([`switched on in ${listPath}`]);
  }
  return process.exit(0);
};

if (command === "run") await runCommand();
else if (command === "touched") touchedCommand();
else fail([`unknown command ${command}: run | touched`]);
