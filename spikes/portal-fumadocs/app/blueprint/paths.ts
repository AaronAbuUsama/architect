// Every page's URL, from the blueprint: what the source makes pages for, and what the build prerenders.
import { M } from "./model.ts";

export type PageKind =
  | { kind: "home" } | { kind: "proof" } | { kind: "attention" } | { kind: "thing"; thing: string } | { kind: "operation"; operation: string }
  | { kind: "event"; thing: string; event: string } | { kind: "machine"; thing: string } | { kind: "environment"; environment: string }
  | { kind: "reference"; table: "machines" | "events" | "errors" | "values" | "roles" } | { kind: "journeys" };

/** Virtual pages: `path` places a page in the sidebar tree, `slugs` give its URL (F2 §5's addresses). */
export const pages = (): Array<{ path: string; slugs: string[]; title: string; description: string; page: PageKind }> => [
  { path: "index.page", slugs: [], title: "Overview", description: `Everything ${"acme"} declares, and what is proved where.`, page: { kind: "home" } },
  { path: "proof/index.page", slugs: ["proof"], title: "Proof", description: "Every operation in every environment, and the nine evals behind each verdict.", page: { kind: "proof" } },
  { path: "proof/attention.page", slugs: ["proof", "attention"], title: "Needs attention", description: "Everything not proved or over budget, and how to clear it.", page: { kind: "attention" } },
  ...Object.values(M.things).flatMap((t) => [
    { path: `things/${t.name}/index.page`, slugs: ["things", t.name], title: t.name, description: t.description, page: { kind: "thing" as const, thing: t.name } },
    ...Object.values(M.operations).filter((o) => o.thing === t.name).map((o) => ({
      path: `things/${t.name}/${o.verb}.page`, slugs: ["operations", o.name], title: o.name, description: o.description, page: { kind: "operation" as const, operation: o.name } })),
    ...(t.machine ? [{ path: `things/${t.name}/machine.page`, slugs: ["things", t.name, "machine"], title: `${t.machine.states.length} states, ${Object.keys(t.machine.moves).length} moves`,
      description: `The states ${t.name} moves through: ${t.machine.states.join(", ")}.`, page: { kind: "machine" as const, thing: t.name } }] : []),
    ...Object.keys(t.events ?? {}).map((e) => ({
      path: `things/${t.name}/${e}.page`, slugs: ["things", t.name, "events", e], title: e, description: `An event of ${t.name}.`, page: { kind: "event" as const, thing: t.name, event: e } })),
  ]),
  ...(["machines", "events", "errors", "values", "roles"] as const).map((table) => ({
    path: `reference/${table}.page`, slugs: ["reference", table], title: table[0]!.toUpperCase() + table.slice(1), description: "", page: { kind: "reference" as const, table } })),
  ...Object.values(M.environments).map((e) => ({
    path: `environments/${e.name}.page`, slugs: ["environments", e.name], title: e.name, description: `Runs ${e.runs}.`, page: { kind: "environment" as const, environment: e.name } })),
  { path: "journeys.page", slugs: ["journeys"], title: "Journeys", description: "Not available yet.", page: { kind: "journeys" } },
];

export const paths = () => pages().map((p) => `/${p.slugs.join("/")}`).filter((p) => p !== "/");
