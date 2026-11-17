// The blueprint as the site reads it: acme's real generated/portal/blueprint.json, and the joins every page needs.
// A site generator gets exactly this file; nothing here reads project source.
import raw from "./acme.json";

export type Value = { type: string; bits?: number; max?: number; prefix?: string };
export type Field = { value: Value; named?: string; ref?: string; optional?: boolean };
export type Fields = Record<string, Field>;
export type Move = { from: string[]; to: string[]; emits: string };
export type Machine = { states: string[]; moves: Record<string, Move>; notFrom: { error: string; exit: number; code: string } };
export type Thing = {
  name: string; code: string; description: string; lives: string; fields: Fields; machine: Machine | null; hash: string;
  events?: Record<string, Fields>; errors?: Record<string, { fields: Fields; exit: number; code: string }>; roles: string[];
};
export type Allowed = { kind: string; role?: string; path?: string };
export type Operation = {
  kind: "operation" | "read"; name: string; thing: string; verb: string; identifier: string; file: string; description: string;
  payload: Fields; answer: Fields; move: (Move & { key: string }) | null; errors: string[]; refusals: string[]; allowed: Allowed[];
  steps: Record<string, { name: string; type: string }>; idempotent: "request" | null; runs: string; test: string;
  budget: { p95Ms: number } | null; hash: string;
};
export type Environment = {
  name: string; file: string; runs: string; identity: string; lifetimeMs: number | null; promotesFrom: string | null; hash: string;
  cloud: { provider: string; database: string } | null; database: string | null;
  deploy: Record<string, { how: string; domain: string }>; publish: Record<string, Array<{ how: string; tag?: string | null; tap?: string; on?: string }>>;
};
type Blueprint = {
  project: string; digest: string; _source: string; docs: Record<string, string>;
  dependsOnByOperation: Record<string, Record<string, string>>; extensions: Record<string, { state: string; reason?: string }>;
  model: { things: Record<string, Thing>; operations: Record<string, Operation>; environments: Record<string, Environment>; values: Record<string, Value>; refusals: Record<string, string> };
};

export const BP = raw as unknown as Blueprint;
export const M = BP.model;
export const things = Object.values(M.things);
export const operations = Object.values(M.operations);
export const opsOf = (thing: string) => operations.filter((o) => o.thing === thing);

export type ErrorInfo = { name: string; code: string; exit: number | null; thing: string | null; fields: Fields; kind: "declared" | "wrong state" | "built in"; when: Record<string, string> };
/** Every refusal, with the "when" the generated docs give per operation. */
export const errors: Record<string, ErrorInfo> = (() => {
  const out: Record<string, ErrorInfo> = {};
  for (const t of things) {
    for (const [n, e] of Object.entries(t.errors ?? {})) out[n] = { name: n, code: e.code, exit: e.exit, thing: t.name, fields: e.fields, kind: "declared", when: {} };
    if (t.machine) { const nf = t.machine.notFrom; out[nf.error] = { name: nf.error, code: nf.code, exit: nf.exit, thing: t.name, fields: {}, kind: "wrong state", when: {} }; }
  }
  for (const [n, code] of Object.entries(M.refusals)) out[n] ??= { name: n, code, exit: null, thing: null, fields: {}, kind: "built in", when: {} };
  for (const [path, md] of Object.entries(BP.docs)) {
    const at = md.indexOf("## Refusals"); if (at < 0) continue;
    for (const line of md.slice(at).split("\n").slice(4)) {
      const c = line.split("|").map((s) => s.trim()); if (c.length < 6) break;
      const e = out[c[1]!]; if (!e) continue; e.exit ??= Number(c[2]); e.when[path.replace(/\.md$/, "").replace("/", ".")] = c[4]!;
    }
  }
  return out;
})();
export const refusedBy = (error: string) => operations.filter((o) => o.refusals.includes(error)).map((o) => o.name);

export const events = things.flatMap((t) => Object.entries(t.events ?? {}).map(([name, fields]) => ({
  name, thing: t.name, fields, emittedBy: opsOf(t.name).filter((o) => o.move?.emits === name),
})));
export const moves = things.flatMap((t) => (t.machine ? Object.entries(t.machine.moves).map(([key, m]) => ({ thing: t.name, key, ...m, op: opsOf(t.name).find((o) => o.move?.key === key) })) : []));

/** Roles as columns of the access matrix: every declared role, then the two built-in audiences. */
export const roles = [...things.flatMap((t) => t.roles.map((r) => `${t.name}.${r}`)), "signed-in", "anyone"];
export const access = (op: Operation, role: string): Allowed | undefined =>
  op.allowed.find((a) => (role === "signed-in" || role === "anyone" ? a.kind === role : a.role === role));

export const typeText = (v: Value) => v.type === "uint" || v.type === "int" ? `${v.type}${v.bits}` : v.type === "text" ? `text ≤ ${v.max}` : v.type === "id" ? `id (${v.prefix}_…)` : v.type;
