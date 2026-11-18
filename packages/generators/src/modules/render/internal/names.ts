import type { Model, OperationModel, StoreModel, ThingModel } from "@orthograph/compiler";

export const GENERATED = "// Generated from the blueprint. Do not edit.";
export const scaffolded = (from: string) => `// Scaffolded from ${from}. Yours from now on.`;

export const pascal = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
export const camel = (name: string) => pascal(name).replace(/^./, (c) => c.toLowerCase());

/** The variable an operation goes by in generated code: `allowance.grant` is `allowanceGrant`. */
export const opVar = (op: OperationModel) => `${camel(op.thing)}${pascal(op.verb)}`;

/** Climb from a generated file back to the project root. */
export const toRoot = (from: string) => "../".repeat(from.split("/").length - 1);

/** Import a declaration: the project's own by path from `from`, a plugin's by its package specifier, as written. */
export const declarationAt = (from: string, file: string) => (file.startsWith("blueprint/") ? `${toRoot(from)}${file}` : file);

/** A thing's own file (`thing`, `errors`, `events`): in the project, or in the plugin it came from. */
export const thingFileAt = (from: string, thing: ThingModel, file: "thing" | "errors" | "events") =>
  thing.from.kind !== "app" ? `${thing.from.package}/blueprint/things/${thing.from.thing}/${file}.js` : `${toRoot(from)}blueprint/things/${thing.name}/${file}.ts`;

/** A store's own file: the project's `blueprint/stores/<name>.ts`, or the plugin's `stores/<store>.js`. */
export const storeFileAt = (from: string, store: StoreModel) =>
  store.from ? `${store.from.package}/blueprint/stores/${store.from.store}.js` : `${toRoot(from)}blueprint/stores/${store.name}.ts`;

/** The Worker binding of a declared database store's D1: `ledger` is `DB_LEDGER`, `echo-ledger` is `DB_ECHO_LEDGER`. */
export const bindingOf = (store: StoreModel) => `DB_${store.name.toUpperCase().replaceAll("-", "_")}`;

/** The declared stores the Worker binds a D1 for: a database store, in name order. */
export const databaseStores = (model: Model): ReadonlyArray<StoreModel> =>
  Object.values(model.stores ?? {}).filter((s) => s.kind === "database");

/** An operation's handler for the worker: the project's `src/<thing>/<verb>.ts`, or the plugin's `src/<thing>/<verb>.js`. */
export const handlerAt = (from: string, op: OperationModel) =>
  op.from.kind !== "app" ? `${op.from.package}/src/${op.from.thing}/${op.verb}.js` : `${toRoot(from)}src/${op.thing}/${op.verb}.ts`;

export const lines = (...parts: ReadonlyArray<string | ReadonlyArray<string>>) => parts.flat().join("\n") + "\n";

/** HTTP status per kind of refusal: a declared data error, a machine in the wrong state, a caller without the role. */
export const STATUS = { declared: 422, notFrom: 409, notAllowed: 403 } as const;
export const NOT_ALLOWED_EXIT = 3;
