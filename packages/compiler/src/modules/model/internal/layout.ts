// Reads the blueprint's layout: which file holds what, and the name each declaration takes from its path or export.
import type { AnyErrorClass, Environment, Event, Machine, Mount, Operation, Read, Role, Thing, Value } from "orthograph";
import type { LoadedFile } from "#modules/source/types.js";
import type { CallReach } from "#modules/mounts/types.js";

/** Where a plugin's thing came from (M1-plugins section 7): `thing` is the plugin's own name for it. */
export interface From {
  readonly mount: string;
  readonly package: string;
  readonly version: string;
  readonly thing: string;
}

export interface ThingFiles {
  readonly name: string;
  /** Its folder, as messages name it: `blueprint/things/<name>`, or `<package>/blueprint/things/<thing>`. */
  readonly base: string;
  readonly from?: From;
  thing?: Thing;
  machine?: Machine;
  readonly events: Map<string, Event>;
  readonly errors: Map<string, AnyErrorClass>;
  readonly roles: Map<string, Role>;
  readonly verbs: Map<string, { readonly file: string; readonly declaration: Operation | Read }>;
}

export interface Layout {
  readonly values: Map<string, Value>;
  /** Environments by the name their file gives them: `environments/staging.ts` is `staging`. */
  readonly environments: Map<string, { readonly file: string; readonly declaration: Environment }>;
  readonly things: Map<string, ThingFiles>;
  /** Mounts by the name their file gives them: `features/echo.ts` is `echo`. */
  readonly mounts: Map<string, MountFile>;
  /** What each mounted adapter's call is, by the call object a step holds (filled in when the mounts are folded). */
  readonly calls: Map<unknown, CallReach>;
  readonly problems: Array<string>;
}

export const MOUNT_FOLDERS = { features: "feature", adapters: "adapter", projections: "projection" } as const;
export interface MountFile {
  readonly name: string;
  readonly kind: (typeof MOUNT_FOLDERS)[keyof typeof MOUNT_FOLDERS];
  readonly file: string;
  readonly mount: Mount;
}

const kindOf = (x: unknown): string | undefined =>
  typeof x === "object" && x !== null ? ((x as { kind?: unknown }).kind as string | undefined) : undefined;
const isErrorClass = (x: unknown): x is AnyErrorClass =>
  typeof x === "function" && "exit" in x && "fields" in x && "schema" in x;

export const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Read files laid out as a blueprint. `at` says how a file is named in messages and imports: the project's own are
 * `blueprint/<path>`; a plugin's are its package specifier, `@x/y/blueprint/<path>`, and only its `things/` are read.
 */
export const readLayout = (files: ReadonlyArray<LoadedFile>, at: (path: string) => string = (path) => `blueprint/${path}`): Layout => {
  const layout: Layout = { values: new Map(), environments: new Map(), things: new Map(), mounts: new Map(), calls: new Map(), problems: [] };
  const thingFiles = (name: string): ThingFiles => {
    const found = layout.things.get(name);
    if (found) return found;
    const fresh: ThingFiles = { name, base: at(`things/${name}`), events: new Map(), errors: new Map(), roles: new Map(), verbs: new Map() };
    layout.things.set(name, fresh);
    return fresh;
  };

  for (const { path, exports } of files) {
    const parts = path.replace(/\.(ts|js)$/, "").split("/");
    const folder = parts[0] as keyof typeof MOUNT_FOLDERS;
    if (Object.hasOwn(MOUNT_FOLDERS, folder) && parts.length === 2) {
      const name = parts[1]!;
      if (!NAME.test(name)) layout.problems.push(`${at(path)}: mount "${name}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      if (kindOf(d) !== "mount") layout.problems.push(`${at(path)}: the default export must be a Blueprint.use(…) of a ${MOUNT_FOLDERS[folder]}`);
      else layout.mounts.set(name, { name, kind: MOUNT_FOLDERS[folder], file: at(path), mount: d as Mount });
      continue;
    }
    if (parts[0] === "values" && parts.length === 2) {
      for (const [k, v] of Object.entries(exports)) if (kindOf(v) === "value") layout.values.set(k, v as Value);
      continue;
    }
    if (parts[0] === "environments" && parts.length === 2) {
      const name = parts[1]!;
      if (!NAME.test(name)) layout.problems.push(`${at(path)}: environment "${name}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      if (kindOf(d) !== "environment") layout.problems.push(`${at(path)}: the default export must be a Blueprint.environment`);
      else layout.environments.set(name, { file: at(path), declaration: d as Environment });
      continue;
    }
    if (parts[0] !== "things" || parts.length < 3) {
      layout.problems.push(`${at(path)}: not a place the blueprint reads (values/<file>.ts, environments/<name>.ts, things/<thing>/..., or a mount in features/, adapters/ or projections/)`);
      continue;
    }
    const name = parts[1]!;
    if (!NAME.test(name)) layout.problems.push(`${at(path)}: thing folder "${name}" must be lowercase words joined by dashes`);
    const t = thingFiles(name);
    const file = parts.slice(2).join("/");
    const each = (want: string) => Object.entries(exports).filter(([, v]) => kindOf(v) === want);
    if (file === "thing") {
      const found = each("thing");
      if (found.length !== 1) layout.problems.push(`${at(path)}: must export exactly one Blueprint.thing`);
      else t.thing = found[0]![1] as Thing;
    } else if (file === "machine") {
      const found = each("machine");
      if (found.length !== 1) layout.problems.push(`${at(path)}: must export exactly one Blueprint.machine`);
      else t.machine = found[0]![1] as Machine;
    } else if (file === "events") {
      for (const [k, v] of each("event")) t.events.set(k, v as Event);
    } else if (file === "errors") {
      for (const [k, v] of Object.entries(exports)) if (isErrorClass(v)) t.errors.set(k, v);
    } else if (file === "roles") {
      for (const [k, v] of each("role")) t.roles.set(k, v as Role);
    } else if (parts[2] === "verbs" && parts.length === 4) {
      const verb = parts[3]!;
      if (!NAME.test(verb)) layout.problems.push(`${at(path)}: verb "${verb}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      const kind = kindOf(d);
      if (kind !== "operation" && kind !== "read") layout.problems.push(`${at(path)}: the default export must be a Blueprint.operation or a Blueprint.read`);
      else t.verbs.set(verb, { file: at(path), declaration: d as Operation | Read });
    } else {
      layout.problems.push(`${at(path)}: not a file a thing has (thing, machine, events, errors, roles, verbs/<verb>)`);
    }
  }
  for (const t of layout.things.values()) if (!t.thing) layout.problems.push(`${t.base}: has no thing.ts`);
  return layout;
};

/** `change-role` becomes `changeRole`; `allowance` becomes `Allowance` with `pascal`. */
export const camel = (name: string): string => name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
export const pascal = (name: string): string => camel(name).replace(/^[a-z]/, (c) => c.toUpperCase());
