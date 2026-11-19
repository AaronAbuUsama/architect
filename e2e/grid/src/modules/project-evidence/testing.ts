// Real evidence for the row evals' tests: a project's checked-in `generated/` folder, the portal rendered over its blueprint, and, for Plugged
// In, the CLI help, MCP tools, spans and prove report a real run wrote (`e2e/grid/fixtures/plugged-in-run.json`, captured by `main.ts capture`).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Portal, Wire } from "@orthograph/portal";
import type { Eval, Finding } from "../grid/types.ts";
import { ProjectEvidenceService } from "./service.ts";
import type { ProjectEvidence, ProjectModel, ProjectPorts } from "./types.ts";

const root = join(import.meta.dirname, "../../../../..");
const run = JSON.parse(readFileSync(join(root, "e2e/grid/fixtures/plugged-in-run.json"), "utf8")) as Pick<ProjectEvidence, "cli" | "mcp" | "spans" | "prove">;

const portalOf = (project: string) => (route: string): Effect.Effect<string | undefined> =>
  Wire.decode(JSON.parse(readFileSync(join(project, "generated/portal/blueprint.json"), "utf8"))).pipe(
    Effect.flatMap((blueprint) => Portal.handle({ blueprint, reader: null, bundleRevision: null }, new Request(`http://portal.test${route}`))),
    Effect.flatMap((response) => (response.status === 200 ? Effect.promise(() => response.text()) : Effect.succeed(undefined))),
    Effect.orElseSucceed(() => undefined),
  );

const tree = (dir: string, from = dir): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tree(join(dir, e.name), from) : [join(dir, e.name).slice(from.length + 1)]));

/** A project's real evidence: what its checked-in outputs say. A project with no captured run has no CLI, MCP, spans or prove report. */
export const evidenceOf = (name: "plugged-in" | "acme"): Promise<ProjectEvidence> => {
  const project = join(root, "examples", name);
  const captured = name === "plugged-in";
  const ports: ProjectPorts = {
    model: Effect.sync(() => JSON.parse(readFileSync(join(project, "generated/model/model.json"), "utf8")) as ProjectModel),
    generated: Effect.sync(() => Object.fromEntries(tree(join(project, "generated")).map((path) => [`generated/${path}`, readFileSync(join(project, "generated", path), "utf8")]))),
    portal: portalOf(project),
    cliHelp: (words) => Effect.succeed(captured ? run.cli[words.join(" ")] : undefined),
    mcpTools: Effect.succeed(captured ? run.mcp : undefined),
    spans: Effect.succeed(captured ? run.spans : undefined),
    prove: Effect.succeed(captured ? run.prove : undefined),
  };
  return Effect.runPromise(ProjectEvidenceService.gather({ ports, wanted: new Set(["portal", "cli", "mcp"]) })).then((e) => e!);
};

/** One eval's finding for one subject: a missing eval is a red finding that names it, never a throw. */
export const judge = (evals: ReadonlyArray<Eval<ProjectEvidence>>, cell: string, subject: string, evidence: ProjectEvidence): Finding => {
  const found = evals.find((x) => x.cell === cell);
  return found === undefined ? { ok: false, why: [`no eval for ${cell}`] } : found.judge(subject, evidence);
};

/** The evidence with one generated file changed. */
export const editFile = (e: ProjectEvidence, path: string, change: (text: string) => string): ProjectEvidence => ({ ...e, files: { ...e.files, [path]: change(e.files[path] ?? "") } });
/** The evidence with one portal page changed. */
export const editPortal = (e: ProjectEvidence, route: string, change: (html: string) => string): ProjectEvidence => ({ ...e, portal: { ...e.portal, [route]: change(e.portal[route] ?? "") } });
/** The evidence with the spans changed. */
export const editSpans = (e: ProjectEvidence, change: (spans: NonNullable<ProjectEvidence["spans"]>) => NonNullable<ProjectEvidence["spans"]>): ProjectEvidence => ({ ...e, spans: change(e.spans ?? []) });
/** The evidence with a prove line taken away, as if prove had not printed it with a tick. */
export const withoutProveLine = (e: ProjectEvidence, line: string): ProjectEvidence => ({ ...e, prove: { journeys: e.prove?.journeys ?? [], lines: (e.prove?.lines ?? []).filter((l) => !l.startsWith(line)) } });
