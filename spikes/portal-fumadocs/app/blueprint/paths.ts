// Every page's URL, from the blueprint: what the source makes pages for, and what the build prerenders.
import { M, errors, roles } from "./model.ts";

export type PageKind =
  | { kind: "home" } | { kind: "proof" } | { kind: "attention" } | { kind: "thing"; thing: string } | { kind: "operation"; operation: string }
  | { kind: "event"; thing: string; event: string } | { kind: "machine"; thing: string } | { kind: "error"; error: string } | { kind: "role"; role: string } | { kind: "value"; value: string } | { kind: "environment"; environment: string }
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
    ...(t.machine ? [{ path: `things/${t.name}/machine.page`, slugs: ["things", t.name, "machine"], title: "Machine",
      description: `The states ${t.name} moves through: ${t.machine.states.join(", ")}.`, page: { kind: "machine" as const, thing: t.name } }] : []),
    ...Object.keys(t.events ?? {}).map((e) => ({
      path: `things/${t.name}/${e}.page`, slugs: ["things", t.name, "events", e], title: e, description: `An event of ${t.name}.`, page: { kind: "event" as const, thing: t.name, event: e } })),
  ]),
  ...(["machines", "events", "errors", "values", "roles"] as const).map((table) => ({
    path: ["errors", "values", "roles"].includes(table) ? `reference/${table}/index.page` : `reference/${table}.page`, slugs: ["reference", table], title: table[0]!.toUpperCase() + table.slice(1), description: "", page: { kind: "reference" as const, table } })),
  ...Object.values(errors).map((e) => ({ path: `reference/errors/${e.name}.page`, slugs: ["reference", "errors", e.name], title: e.name,
    description: `${e.code}${e.exit !== null ? `, exit ${e.exit}` : ""}. ${e.kind === "wrong state" ? `Refused when ${e.thing} is in a state the move does not start from.` : e.kind === "built in" ? "Built into every project." : `Declared by ${e.thing}.`}`, page: { kind: "error" as const, error: e.name } })),
  ...roles.map((r) => ({ path: `reference/roles/${r}.page`, slugs: ["reference", "roles", r], title: r,
    description: r === "anyone" ? "Every caller, signed in or not." : r === "signed-in" ? "Any caller with a session or an API key." : `The ${r.split(".")[1]} of ${/^[aeiou]/.test(r) ? "an" : "a"} ${r.split(".")[0]}.`, page: { kind: "role" as const, role: r } })),
  ...Object.entries(M.values).map(([n, v]) => ({ path: `reference/values/${n}.page`, slugs: ["reference", "values", n], title: n, description: `A named value: ${v.type}.`, page: { kind: "value" as const, value: n } })),
  ...Object.values(M.environments).map((e) => ({
    path: `environments/${e.name}.page`, slugs: ["environments", e.name], title: e.name, description: `Runs ${e.runs}.`, page: { kind: "environment" as const, environment: e.name } })),
  { path: "journeys.page", slugs: ["journeys"], title: "Journeys", description: "Not available yet.", page: { kind: "journeys" } },
];

export const paths = () => pages().map((p) => `/${p.slugs.join("/")}`).filter((p) => p !== "/");
