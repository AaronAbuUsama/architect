// Reads the blueprint's layout: which file holds what, and the name each declaration takes from its path or export.
import type { AnyErrorClass, Event, Machine, Operation, Read, Role, Thing, Value } from "@architect/blueprint";
import type { LoadedFile } from "#modules/source/types.ts";

export interface ThingFiles {
  readonly name: string;
  thing?: Thing;
  machine?: Machine;
  readonly events: Map<string, Event>;
  readonly errors: Map<string, AnyErrorClass>;
  readonly roles: Map<string, Role>;
  readonly verbs: Map<string, { readonly file: string; readonly declaration: Operation | Read }>;
}

export interface Layout {
  readonly values: Map<string, Value>;
  readonly things: Map<string, ThingFiles>;
  readonly problems: Array<string>;
}

const kindOf = (x: unknown): string | undefined =>
  typeof x === "object" && x !== null ? ((x as { kind?: unknown }).kind as string | undefined) : undefined;
const isErrorClass = (x: unknown): x is AnyErrorClass =>
  typeof x === "function" && "exit" in x && "fields" in x && "schema" in x;

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const readLayout = (files: ReadonlyArray<LoadedFile>): Layout => {
  const layout: Layout = { values: new Map(), things: new Map(), problems: [] };
  const thingFiles = (name: string): ThingFiles => {
    const found = layout.things.get(name);
    if (found) return found;
    const fresh: ThingFiles = { name, events: new Map(), errors: new Map(), roles: new Map(), verbs: new Map() };
    layout.things.set(name, fresh);
    return fresh;
  };

  for (const { path, exports } of files) {
    const parts = path.replace(/\.ts$/, "").split("/");
    if (parts[0] === "values" && parts.length === 2) {
      for (const [k, v] of Object.entries(exports)) if (kindOf(v) === "value") layout.values.set(k, v as Value);
      continue;
    }
    if (parts[0] !== "things" || parts.length < 3) {
      layout.problems.push(`blueprint/${path}: not a place the blueprint reads (values/<file>.ts or things/<thing>/...)`);
      continue;
    }
    const name = parts[1]!;
    if (!NAME.test(name)) layout.problems.push(`blueprint/${path}: thing folder "${name}" must be lowercase words joined by dashes`);
    const t = thingFiles(name);
    const file = parts.slice(2).join("/");
    const each = (want: string) => Object.entries(exports).filter(([, v]) => kindOf(v) === want);
    if (file === "thing") {
      const found = each("thing");
      if (found.length !== 1) layout.problems.push(`blueprint/${path}: must export exactly one Blueprint.thing`);
      else t.thing = found[0]![1] as Thing;
    } else if (file === "machine") {
      const found = each("machine");
      if (found.length !== 1) layout.problems.push(`blueprint/${path}: must export exactly one Blueprint.machine`);
      else t.machine = found[0]![1] as Machine;
    } else if (file === "events") {
      for (const [k, v] of each("event")) t.events.set(k, v as Event);
    } else if (file === "errors") {
      for (const [k, v] of Object.entries(exports)) if (isErrorClass(v)) t.errors.set(k, v);
    } else if (file === "roles") {
      for (const [k, v] of each("role")) t.roles.set(k, v as Role);
    } else if (parts[2] === "verbs" && parts.length === 4) {
      const verb = parts[3]!;
      if (!NAME.test(verb)) layout.problems.push(`blueprint/${path}: verb "${verb}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      const kind = kindOf(d);
      if (kind !== "operation" && kind !== "read") layout.problems.push(`blueprint/${path}: the default export must be a Blueprint.operation or a Blueprint.read`);
      else t.verbs.set(verb, { file: `blueprint/${path}`, declaration: d as Operation | Read });
    } else {
      layout.problems.push(`blueprint/${path}: not a file a thing has (thing, machine, events, errors, roles, verbs/<verb>)`);
    }
  }
  for (const t of layout.things.values()) if (!t.thing) layout.problems.push(`blueprint/things/${t.name}: has no thing.ts`);
  return layout;
};

/** `change-role` becomes `changeRole`; `allowance` becomes `Allowance` with `pascal`. */
export const camel = (name: string): string => name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
export const pascal = (name: string): string => camel(name).replace(/^[a-z]/, (c) => c.toUpperCase());
