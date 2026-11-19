// The model the portal falls out of: Plugged In's model.json, as Codex generated it on `links/stage-1`
// (examples/links/generated/model/model.json), cut to K9's stage-1 things. Nothing in here is written by hand.
import raw from "./model.json" with { type: "json" };

export type Value = { type: "id"; prefix: string } | { type: "uint"; bits: number } | { type: "text"; max: number } | { type: "schema" };
export type Visibility = "secret" | { private: string[] };
export type Field = { value: Value; named?: string; ref?: string; optional?: boolean; visibility?: Visibility };
export type Fields = Record<string, Field>;
export type Allowed = { kind: "anyone" } | { kind: "signed-in" } | { kind: "role"; role: string } | { kind: "role-of"; role: string; path: string };
export type Machine = {
  states: string[];
  moves: Record<string, { from: string[]; to: string[]; emits: string }>;
  notFrom: { error: string; exit: number; code: string };
};
export type Thing = {
  name: string; identifier: string; code: string; description: string; fields: Fields; lives: "database" | "actor";
  store?: string; machine: Machine | null; events: Record<string, Fields>;
  errors: Record<string, { fields: Fields; exit: number; code: string }>; roles: string[]; hash: string;
};
export type Step = { name: string; type: string; writes?: string[]; optional?: boolean; call?: { mount: string; call: string } };
export type Operation = {
  kind: "operation" | "read"; name: string; thing: string; verb: string; identifier: string; file: string; description: string;
  payload: Fields; answer: Fields; move: { key: string; from: string[]; to: string[]; emits: string } | null;
  errors: string[]; refusals: string[]; allowed: Allowed[]; steps: Record<string, Step>; idempotent: "request" | null;
  runs: "server" | "client"; test: "unit" | "network"; budget: { p95Ms: number } | null; hash: string;
};
export type Environment = {
  name: string; file: string; runs: string; identity: string; lifetimeMs: number | null;
  cloud: { provider: string; database: string } | null; database: string | null; secrets: Record<string, string>;
  promotesFrom: string | null; telemetry?: { sink: string; group?: string }[];
  deploy: Record<string, { how: string; domain: string | null }>; publish: Record<string, { how: string; tag?: string | null }[]>; hash: string;
};
export type Model = {
  refusals: Record<string, string>; values: Record<string, Value>; things: Record<string, Thing>;
  operations: Record<string, Operation>; environments: Record<string, Environment>;
};

export const model = raw as unknown as Model;
export const things = Object.values(model.things);
export const operations = Object.values(model.operations);
export const environments = ["local", "test", "staging", "production"].map((n) => model.environments[n]!);
export const opsOf = (thing: string) => operations.filter((o) => o.thing === thing);
export const thingOfError = (error: string) => things.find((t) => error in t.errors || t.machine?.notFrom.error === error);

/** A value as the docs write it: `id hdl_…`, `text ≤120`, `uint32`, or the named schema. */
export const typeText = (f: Field): string => {
  const v = f.value;
  const base = v.type === "id" ? `id ${v.prefix}_…` : v.type === "text" ? `text ≤${v.max}` : v.type === "uint" ? `uint${v.bits}` : "schema";
  return f.named ? `${f.named} · ${base}` : base;
};

export const allowedText = (a: Allowed): string =>
  a.kind === "role" ? a.role.split(".").pop()! : a.kind === "role-of" ? `${a.role} of ${a.path}` : a.kind;

/** Every refusal with where it comes from: declared on a thing, the machine's, or the runtime's. */
export const refusalRows = () => Object.entries(model.refusals).map(([name, code]) => {
  const t = thingOfError(name);
  const declared = t?.errors[name];
  const source = name === "NotAllowed" ? "runtime" : declared ? "declared" : "machine";
  const exit = declared?.exit ?? (t?.machine?.notFrom.error === name ? t.machine.notFrom.exit : 3);
  const raisedBy = operations.filter((o) => o.refusals.includes(name)).map((o) => o.name);
  return { name, code, thing: t?.name ?? "", source, exit, raisedBy };
}).sort((a, b) => a.code.localeCompare(b.code));

export const short = (hash: string) => hash.replace(/^sha256[-:]/, "").slice(0, 7);
export const page = {
  home: "home.html",
  thing: (t: string) => `thing-${t}.html`,
  /** "spans" was a tab until round 4; a link to a trace now opens the Metrics tab with the call's trace drawer open. */
  op: (o: string, tab = "contract") => tab === "spans" ? `op-${o}-metrics.html#trace` : `op-${o}${tab === "contract" ? "" : `-${tab}`}.html`,
};
