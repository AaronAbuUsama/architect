// Refusal codes, stable across targets: `[AL-002] AllowanceExceeded { limit: 500 }`. A code is its thing's prefix and a
// number. Declared errors are numbered 1, 2, 3 in the order they are declared in the thing's `errors.ts`; the machine's own
// refusal is always 900; the runtime's refusals belong to no thing and take the prefix `AR`. The model records every code,
// so a generator reads it and never works one out, and a number that has shipped does not move when an error is added.
import type { AnyErrorClass, Thing } from "@architect/blueprint";

/** The refusal of a machine's move that starts from the wrong state. */
export const MACHINE_NUMBER = 900;

/** Refusals the runtime makes for every thing: who may call, before any handler runs. */
export const RUNTIME_CODES = { NotAllowed: "AR-001" } as const;

const PREFIX = /^[A-Z]{2,4}$/;

/** The thing's own prefix, or the first two letters of its name. */
export const prefixOf = (name: string, thing: Thing): string => thing.code ?? name.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase();

export const codeOf = (prefix: string, n: number): string => `${prefix}-${String(n).padStart(3, "0")}`;

/** Each thing's prefix, with a problem for one that is not 2 to 4 capital letters and for two things that share one. */
export const prefixes = (things: ReadonlyMap<string, { readonly thing?: Thing | undefined }>, problems: Array<string>): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  const owner = new Map<string, string>();
  for (const [name, t] of [...things].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!t.thing) continue;
    const prefix = prefixOf(name, t.thing);
    if (!PREFIX.test(prefix)) problems.push(`blueprint/things/${name}/thing.ts: the refusal code prefix "${prefix}" must be 2 to 4 capital letters; set \`code\` on the thing`);
    const other = owner.get(prefix);
    if (other) problems.push(`blueprint/things/${name}/thing.ts: ${name} and ${other} would both have refusal codes starting ${prefix}-; give one of them a \`code\` of its own`);
    else owner.set(prefix, name);
    out.set(name, prefix);
  }
  return out;
};

/** A thing's declared errors in declaration order. A class made before errors were numbered falls back to its name. */
export const inDeclarationOrder = (errors: ReadonlyMap<string, AnyErrorClass>): ReadonlyArray<readonly [string, AnyErrorClass]> =>
  [...errors].sort(([an, a], [bn, b]) => (typeof a.sequence === "number" && typeof b.sequence === "number" ? a.sequence - b.sequence : an < bn ? -1 : an > bn ? 1 : 0));

/** Every refusal's name and code in the project: the declared ones, each machine's, and the runtime's. */
export const refusalsOf = (
  things: Readonly<Record<string, { readonly errors: Readonly<Record<string, { readonly code: string }>>; readonly machine: { readonly notFrom: { readonly error: string; readonly code: string } } | null }>>,
  problems: Array<string>,
): Readonly<Record<string, string>> => {
  const out: Record<string, string> = { ...RUNTIME_CODES };
  const add = (name: string, code: string, where: string) => {
    if (name in out) problems.push(`${where}: the refusal ${name} is declared twice, and refusals are named for the whole project`);
    out[name] = code;
  };
  for (const [thing, t] of Object.entries(things)) {
    for (const [name, e] of Object.entries(t.errors)) add(name, e.code, `blueprint/things/${thing}/errors.ts`);
    if (t.machine) add(t.machine.notFrom.error, t.machine.notFrom.code, `blueprint/things/${thing}/machine.ts`);
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
};
