// The data file the page renders from: the blueprint, every anchor, every output with each line's sources, and per
// operation what it reaches. Only facts measured or read this run go in; no field is typed for the page by hand.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Anchor } from "#modules/anchors/types.js";
import { stepsFor } from "#modules/runtime/service.js";
import type { AssembleInput, OpData, Output } from "./types.ts";

/** Which output a rendered path is, and the generator that writes its template lines. */
const OUTPUTS: ReadonlyArray<{ readonly id: Output; readonly match: RegExp; readonly by: string }> = [
  { id: "handler", match: /^generated\/api\/src\/.+\.handler\.ts$/, by: "packages/projections/src/modules/api/internal/api.ts" },
  { id: "model", match: /^generated\/model\//, by: "packages/projections/src/modules/model" },
  { id: "api", match: /^generated\/api\//, by: "packages/projections/src/modules/api" },
  { id: "server", match: /^generated\/server\//, by: "packages/projections/src/modules/server" },
  { id: "sdk", match: /^generated\/sdk\//, by: "packages/generators/src/modules/render/internal/sdk.ts" },
  { id: "cli", match: /^generated\/cli\//, by: "packages/generators/src/modules/render/internal/cli.ts" },
  { id: "mcp", match: /^generated\/mcp\//, by: "packages/generators/src/modules/render/internal/mcp.ts" },
  { id: "docs", match: /^generated\/docs\//, by: "packages/generators/src/modules/render/internal/docs.ts" },
  { id: "portal", match: /^generated\/portal\//, by: "packages/generators/src/modules/portal" },
  { id: "scaffold", match: /^src\//, by: "packages/projections/src/modules/handlers/internal/scaffold.ts" },
];
export const outputOf = (path: string): Output => OUTPUTS.find((o) => o.match.test(path))?.id ?? "api";

const tsFiles = (dir: string): ReadonlyArray<string> =>
  !existsSync(dir) ? [] : readdirSync(dir).sort().flatMap((n) => (statSync(join(dir, n)).isDirectory() ? tsFiles(join(dir, n)) : n.endsWith(".ts") ? [join(dir, n)] : []));

/** Anchors that sweep every file (the app's name, a thing's folder) say little about one operation's excerpts. */
const SWEEPING = (a: Anchor | undefined) => a === undefined || a.kind === "project" || a.id.endsWith("/folder") || a.id.endsWith("/thing");

const operationData = (input: AssembleInput, op: any, byId: ReadonlyMap<string, Anchor>): OpData => {
  const { traced, anchors, projectDir } = input;
  const name: string = op.name;
  const primary = {
    api: `generated/api/src/${op.thing}/${op.verb}.ts`,
    handler: `generated/api/src/${op.thing}/${op.verb}.handler.ts`,
    sdk: `generated/sdk/src/${op.thing}/${op.verb}.ts`,
    cli: `generated/cli/src/${op.thing}/${op.verb}.ts`,
    docs: `generated/docs/${op.thing}/${op.verb}.md`,
    scaffold: `src/${op.thing}/${op.verb}.ts`,
  };
  const own = anchors.filter((a) => a.op === name);
  // What the operation names, and the parts of those: its refusals' exit codes, its move's machine.
  const referred = new Set(own.flatMap((a) => a.refers ?? []));
  const focus = new Set([...own.map((a) => a.id), ...referred]);
  for (const a of anchors) if (a.parent && referred.has(a.parent)) focus.add(a.id);
  const paths = new Set(traced.files.map((f) => f.path));
  const primaryPaths = Object.values(primary).filter((p) => paths.has(p));
  const sweep = anchors.filter((a) => traced.outcomes.get(a.id)?.result === "traced").length / 2;
  const related = new Set(focus);
  for (const p of primaryPaths) for (const ids of traced.from.get(p)?.values() ?? []) if (ids.length <= sweep) for (const id of ids) related.add(id);
  const excerpts: Record<string, ReadonlyArray<number>> = {};
  for (const [path, lines] of traced.from) {
    if (primaryPaths.includes(path)) continue;
    const hit = [...lines].filter(([, ids]) => ids.length <= sweep && ids.some((id) => focus.has(id) && !SWEEPING(byId.get(id)))).map(([i]) => i).sort((x, y) => x - y);
    if (hit.length > 0) excerpts[path] = hit;
  }
  const machine = input.model.things?.[op.thing]?.machine;
  const handlerPath = join(projectDir, primary.scaffold);
  const handler = existsSync(handlerPath) ? readFileSync(handlerPath, "utf8").split("\n") : undefined;
  return {
    name,
    thing: op.thing,
    verb: op.verb,
    description: op.description ?? "",
    file: op.file,
    primary: Object.fromEntries(Object.entries(primary).filter(([, p]) => paths.has(p))),
    excerpts,
    related: [...related].filter((id) => byId.has(id)).map((id) => anchors.findIndex((a) => a.id === id)),
    machine: machine ? { states: machine.states, moves: machine.moves, lit: op.move?.key ?? null } : null,
    runtime: stepsFor({
      allowed: (op.allowed ?? []).map((a: any) => (a.kind === "role-of" ? `the role ${a.role}` : a.kind)),
      idempotent: op.idempotent,
      move: op.move ? { key: op.move.key, from: op.move.from, to: op.move.to, emits: op.move.emits } : undefined,
      steps: Object.keys(op.steps ?? {}),
    }),
    handler: handler ? { path: primary.scaffold, lines: handler, filled: !handler.some((l) => l.includes("Handlers.blank(")) } : null,
  };
};

export const assemble = (input: AssembleInput) => {
  const { traced, anchors, projectDir } = input;
  const byId = new Map(anchors.map((a) => [a.id, a]));
  const blueprint = tsFiles(join(projectDir, "blueprint")).map((p) => ({ path: relative(projectDir, p), lines: readFileSync(p, "utf8").split("\n") }));
  // Sources are written as indexes into `anchors`. A line that moves with most changes (a digest of the whole
  // blueprint) is written as [-1]: it comes from everything, so pointing at any one declaration would mislead.
  const index = new Map(anchors.map((a, i) => [a.id, i]));
  const tracedCount = anchors.filter((a) => traced.outcomes.get(a.id)?.result === "traced").length;
  // A line no change moved is not, by that alone, the generator's. It is called the generator's own words only when
  // the same text is in every operation's file of the same kind (every docs page, every SDK function, every scaffold).
  const kindOf = (path: string, op: any): string | undefined => {
    const own = [`/${op.thing}/${op.verb}.`, `/${op.thing}/${op.verb}.handler.`];
    return own.some((o) => path.includes(o)) ? path.replace(`/${op.thing}/${op.verb}.`, "/*/*.") : undefined;
  };
  const appOps = Object.values(input.model.operations as Record<string, any>).filter((op) => op.kind === "operation" && op.from?.kind === "app");
  const kinds = new Map<string, Array<ReadonlyArray<string>>>();
  const kindOfPath = new Map<string, string>();
  for (const f of traced.files) {
    const op = appOps.find((o) => kindOf(f.path, o) !== undefined);
    if (!op) continue;
    const kind = kindOf(f.path, op)!;
    kindOfPath.set(f.path, kind);
    kinds.set(kind, [...(kinds.get(kind) ?? []), f.content.split("\n")]);
  }
  const common = new Map([...kinds].filter(([, all]) => all.length > 1).map(([k, all]) => [k, new Set(all[0]!.filter((l) => all.every((o) => o.includes(l))))]));
  const files = traced.files.map((f) => ({
    path: f.path,
    output: outputOf(f.path),
    scaffold: f.scaffold,
    lines: f.content.split("\n"),
    made: (traced.made.get(f.path) ?? []).map((id) => index.get(id)!),
    // Untraced lines whose text is in every operation's file of this kind: the generator's own words.
    same: f.content.split("\n").flatMap((l, i) => (!traced.from.get(f.path)?.has(i) && common.get(kindOfPath.get(f.path) ?? "")?.has(l) ? [i] : [])),
    from: Object.fromEntries(
      [...(traced.from.get(f.path) ?? new Map<number, ReadonlyArray<string>>())]
        .sort(([a], [b]) => a - b)
        .map(([line, ids]) => [line, ids.length > tracedCount / 2 ? [-1] : ids.map((id) => index.get(id)!)]),
    ),
  }));
  const operations = Object.values(input.model.operations as Record<string, any>)
    .filter((op) => op.kind === "operation" && op.from?.kind === "app")
    .map((op) => operationData(input, op, byId));
  const attributed = files.reduce((n, f) => n + Object.keys(f.from).length, 0);
  const count = (r: string) => anchors.filter((a) => traced.outcomes.get(a.id)?.result === r).length;
  return {
    counts: { anchors: anchors.length, traced: count("traced"), refused: count("refused"), noChange: count("no-change"), whole: count("whole"), files: files.length, lines: files.reduce((n, f) => n + f.lines.length, 0), attributed },
    generators: Object.fromEntries(OUTPUTS.map((o) => [o.id, o.by])),
    blueprint,
    anchors: anchors.map(({ edits: _edits, ...a }) => ({ ...a, outcome: traced.outcomes.get(a.id) })),
    files,
    operations,
  };
};
