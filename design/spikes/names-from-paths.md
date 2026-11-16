The spike answers the question with **yes**. A name can come from the file path and stay fully typed to the handler, route, client and CLI, with every name string written only in `generated/`. One part needs a convention: an error's name comes from its exported class name. `tsc --noEmit` (strict) passes, and so does the end-to-end test under both bun and `node --experimental-strip-types`. Running the compiler again with no changes gives byte-identical output. Everything is in `/tmp/spike-names`; nothing in the repository was changed, committed or pushed.

## TO THE CONDUCTOR

### README.md

````markdown
# Spike: names from paths

**Question.** Can a declaration's name come from its file path and stay fully type-safe to the handler, the route,
the SDK and the CLI, with no name typed by hand anywhere outside `generated/`?

**Answer: yes.** It takes one compiler step and one convention for errors. Tested with effect@4.1.2, typescript@5.9.3,
bun 1.x and node 22 with `--experimental-strip-types`. Type definitions came from @types/node@22.19.1, the one
package added beyond the brief, so that `compile.ts` typechecks.

## What was tried

- `blueprint-lib.ts` provides `thing(fields)`, `operation(thing, { payload, answer, errors })` and `error(fields)`.
  None of them takes a name.
- Declarations live in `blueprint/things/<thing>/`:
  - `thing.ts`: the thing, as the default export;
  - `verbs/<verb>.ts`: one operation, as the default export;
  - `errors.ts`: one exported class per error.
- There are three operations: `allowance.grant`, `allowance.spend` and `organization.create`.
- `compile.ts` loads each declaration with a dynamic import and checks it:
  - each thing folder and verb file name is a camelCase identifier;
  - each verb file's default export is an operation;
  - each operation's `thing` is the thing of the folder it sits in;
  - no two errors have the same name.
- It then writes two files:
  - `generated/index.ts`: the operations (nested and flat), their names, routes, CLI commands and handler slots;
  - `generated/server.ts`: imports `implementation/handlers/<thing>/<verb>.ts` for every operation.
- `compile.ts --check` fails if writing again would change a file, or if a file in `generated/` is not one it writes.
  A second run is byte-identical.
- `runtime.ts` holds the route table, an in-process server (`Request -> Response`), the client and the CLI. All of
  them are mapped types over the generated `operations` object.
- On the wire, values are encoded with `Schema.toCodecJson`. CLI flags are decoded with `Schema.toCodecStringTree`.

## What was found

1. Wrong code fails to compile:
   - `Handlers.allowance.spnd` fails with TS2551, "Did you mean 'spend'?".
   - A handler whose answer has an undeclared field fails, and the error names the field:
     `"answer fields not in the blueprint": "bonus"`.
   - A handler that fails with an error the operation does not declare fails with TS2375.
2. Renaming `verbs/spend.ts` to `withdraw.ts` and recompiling renames everything:
   - the route becomes `/allowance/withdraw`, the client call `client.allowance.withdraw` and the command
     `acme allowance withdraw`;
   - `generated/server.ts` fails with TS2307 until `implementation/handlers/allowance/withdraw.ts` exists;
   - the old handler fails with TS2339 until its `Handlers.allowance.spend` is changed to `.withdraw`;
   - every caller still using `.spend` fails;
   - the old command `acme allowance spend` is refused when it runs.
   No string is edited; one identifier is.
3. `test/e2e.ts` calls client → route → handler → client in process:
   - it gets the typed answer back;
   - a refusal arrives as a typed error, and `Effect.catchTag` accepts only tags the operation declares;
   - the CLI works end to end.
4. `"allowance.spend"`, `"spend"` and `"/allowance/spend"` appear only in `generated/`. The tests also contain them,
   but only as expected values and as CLI arguments.
5. Cost: 298 files, 17k type instantiations, 0.4 s check time. Hovers and errors show deep types such as
   `Slot<Named<Operation<Thing<…>>>>`; they are readable but long.

## The one convention: how errors get their names

An error's name is its **export name**: `export class AllowanceExceeded extends Blueprint.error({...}) {}`.

- At runtime, the compiler stamps `_tag` on the class.
- In types, `generated/index.ts` narrows `_tag` by **module augmentation**:
  `declare module ".../errors.ts" { interface AllowanceExceeded { readonly _tag: "AllowanceExceeded" } }`.

Without the augmentation, two errors with the same fields would be interchangeable to TypeScript. With it, they are
distinct.

## Limits

- The compiler runs the blueprint files to inspect them, so a blueprint file must have no side effects on import.
- An error's `_tag` is a literal type only after compiling; before that it is `string`.
- `Data.Error` assigns fields onto an `Error` instance, so a field named `message`, `stack` or `cause` would collide.
  A field called `name` works only because the prototype's `_tag` is writable and `name` is left alone. The compiler
  should refuse those field names.
- A thing or verb name must be a camelCase identifier. Kebab-case paths would need a mapping and quoted keys.
- Brands such as `Schema.brand("AllowanceId")` would bring back hand-written strings, so ids here are plain strings.
- `implementation/` imports `generated/`, so on a fresh clone the compiler must run before `tsc`.
- The CLI's command list is typed, but what `runCli` returns is `unknown`, because argv is untyped.

## Keeping generated/ in sync

- In CI, run `compile.ts --check`, as `pnpm generate:check` does in this repository today.
- Locally, either watch `blueprint/**` and `implementation/handlers/**`, or use an Nx sync generator so that
  `nx build` refuses a stale index.

The check is the contract; the watch is a convenience.

## The decision it supports

- Operations are named by path (`things/<thing>/verbs/<verb>.ts`) and errors by export name.
- One compiler writes the only copy of each name string, into `generated/`.
- Every consumer (handler slots, routes, client, CLI) is a mapped type over that one generated object.

## Open risks

- Editor error messages on the deep mapped types may grow with the number of operations. This was not tested beyond
  three operations.
- The error-name convention depends on TypeScript continuing to support merging an interface into a class through
  module augmentation.
- Handlers and callers still write identifiers such as `.spend`. A rename is an edit that compile errors guide, not an
  automatic one.
````

### package.json
```json
{
  "name": "acme",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "compile": "bun compile.ts",
    "typecheck": "tsc --noEmit -p .",
    "test": "bun test/e2e.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "effect": "4.1.2",
    "typescript": "5.9.3"
  },
  "type": "module",
  "devDependencies": {
    "@types/node": "22.19.1"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM"],
    "types": ["node"]
  },
  "include": ["*.ts", "blueprint", "implementation", "generated", "test"]
}
```

### blueprint-lib.ts
```ts
// The Blueprint library: declarations carry no names. Names are attached only by generated/index.ts, which the
// compiler (compile.ts) writes from each declaration's file path (operations, things) or export name (errors).
import type * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export type Fields = Schema.Struct.Fields;

// ---------- things ----------
export interface Thing<F extends Fields = Fields> {
  readonly kind: "thing";
  readonly fields: F;
  readonly schema: Schema.Struct<F>;
}
export const thing = <const F extends Fields>(fields: F): Thing<F> => ({
  kind: "thing",
  fields,
  schema: Schema.Struct(fields),
});

// ---------- errors ----------
const errorName = Symbol.for("architect/errorName");

/** Base of every declared error. `_tag` is `string` here; generated/index.ts narrows it per class to its export name. */
export interface BlueprintError {
  readonly _tag: string;
}
export interface ErrorClass<F extends Fields = Fields> {
  new (args: Schema.Struct.Type<F>): Cause.YieldableError & BlueprintError & Schema.Struct.Type<F>;
  readonly fields: F;
  readonly schema: Schema.Struct<F>;
}
/** Any declared error class. `args: any` because constructor parameters are contravariant. */
export interface AnyErrorClass {
  new (args: any): Cause.YieldableError & BlueprintError;
  readonly fields: Fields;
  readonly schema: Schema.Top;
}

export const error = <const F extends Fields>(fields: F): ErrorClass<F> => {
  // Data.Error copies the constructor's fields onto the instance and makes it yieldable in Effect.gen.
  class E extends Data.Error {
    static readonly fields = fields;
    static readonly schema = Schema.Struct(fields);
  }
  return E as unknown as ErrorClass<F>;
};

/** Called only from generated code: stamps the export name on the class as its runtime `_tag`. */
export const nameError = (cls: AnyErrorClass, name: string): void => {
  Object.defineProperty(cls, errorName, { value: name });
  // Writable: a field may itself be called `name` (Error.prototype.name), and Data.Error assigns fields in its constructor.
  Object.defineProperty(cls.prototype, "_tag", { value: name, enumerable: true, writable: true });
};
export const nameOfError = (cls: AnyErrorClass): string => (cls as unknown as Record<symbol, string>)[errorName]!;

// ---------- operations ----------
export interface Operation<
  T extends Thing = Thing,
  P extends Fields = Fields,
  A extends Fields = Fields,
  E extends ReadonlyArray<AnyErrorClass> = ReadonlyArray<AnyErrorClass>,
> {
  readonly kind: "operation";
  readonly thing: T;
  readonly payload: Schema.Struct<P>;
  readonly answer: Schema.Struct<A>;
  readonly errors: E;
}

export const operation = <
  T extends Thing,
  const P extends Fields,
  const A extends Fields,
  const E extends ReadonlyArray<AnyErrorClass> = readonly [],
>(
  thing: T,
  spec: { readonly payload: P; readonly answer: A; readonly errors?: E },
): Operation<T, P, A, E> => ({
  kind: "operation",
  thing,
  payload: Schema.Struct(spec.payload),
  answer: Schema.Struct(spec.answer),
  errors: (spec.errors ?? []) as unknown as E,
});

/** An operation with the name the compiler found for it. Only generated code calls `named`. */
export type Named<O extends Operation, Th extends string, V extends string> = O & {
  readonly thingName: Th;
  readonly verb: V;
  readonly name: `${Th}.${V}`;
};
export const named = <O extends Operation, const Th extends string, const V extends string>(
  op: O,
  thingName: Th,
  verb: V,
): Named<O, Th, V> => ({ ...op, thingName, verb, name: `${thingName}.${verb}` as `${Th}.${V}` });

// ---------- types read off a declaration ----------
export type AnyNamed = Named<Operation, string, string>;
export type PayloadOf<O> = O extends Operation<any, infer P, any, any> ? Schema.Struct.Type<P> : never;
export type AnswerOf<O> = O extends Operation<any, any, infer A, any> ? Schema.Struct.Type<A> : never;
export type ErrorOf<O> = O extends Operation<any, any, any, infer E> ? InstanceType<E[number]> : never;
export type Ops = Record<string, Record<string, AnyNamed>>;

// ---------- handlers ----------
export interface Handler<O extends AnyNamed = AnyNamed> {
  readonly op: O;
  readonly run: (payload: PayloadOf<O>) => Effect.Effect<AnswerOf<O>, ErrorOf<O>>;
}

/** Fields of A2 that A does not declare; none when A2 is `never` (a handler that always fails). */
type Extra<A2, A> = [A2] extends [never] ? never : Exclude<keyof A2, keyof A>;
/**
 * A slot that takes a handler. An answer with fields the blueprint does not declare is refused: the handler must then
 * also carry a property named after the problem, which no function has, so tsc names the extra fields.
 */
export type Slot<O extends AnyNamed> = <A2 extends AnswerOf<O>, E2 extends ErrorOf<O>>(
  run: ((payload: PayloadOf<O>) => Effect.Effect<A2, E2>) &
    ([Extra<A2, AnswerOf<O>>] extends [never]
      ? unknown
      : { readonly "answer fields not in the blueprint": Extra<A2, AnswerOf<O>> }),
) => Handler<O>;

export type HandlerSlots<T extends Ops> = { readonly [Th in keyof T]: { readonly [V in keyof T[Th]]: Slot<T[Th][V]> } };
export const handlerSlots = <T extends Ops>(ops: T): HandlerSlots<T> =>
  Object.fromEntries(
    Object.entries(ops).map(([th, verbs]) => [
      th,
      Object.fromEntries(Object.entries(verbs).map(([v, op]) => [v, (run: Handler["run"]) => ({ op, run })])),
    ]),
  ) as unknown as HandlerSlots<T>;

/** One handler per operation, keyed by name: a missing or misplaced handler is a type error. */
export type HandlerSet<T extends Ops> = { readonly [Th in keyof T]: { readonly [V in keyof T[Th]]: Handler<T[Th][V]> } };
```

### runtime.ts
```ts
// Route table, server, client and CLI, all derived from the generated operations object. No operation name here.
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import {
  nameOfError,
  type AnswerOf,
  type AnyErrorClass,
  type AnyNamed,
  type ErrorOf,
  type HandlerSet,
  type Handler,
  type Ops,
  type PayloadOf,
} from "./blueprint-lib.ts";

const flatten = <T extends Ops>(ops: T): ReadonlyArray<AnyNamed> =>
  Object.values(ops).flatMap((verbs) => Object.values(verbs));

// ---------- routes ----------
export type RouteOf<O extends AnyNamed> = `/${O["thingName"]}/${O["verb"]}`;
export type Routes<T extends Ops> = {
  readonly [Th in keyof T]: { readonly [V in keyof T[Th]]: { method: "POST"; path: RouteOf<T[Th][V]> } };
};
export const routeOf = <O extends AnyNamed>(op: O): RouteOf<O> => `/${op.thingName}/${op.verb}` as RouteOf<O>;
export const routes = <T extends Ops>(ops: T): Routes<T> =>
  Object.fromEntries(
    Object.entries(ops).map(([th, verbs]) => [
      th,
      Object.fromEntries(Object.entries(verbs).map(([v, op]) => [v, { method: "POST", path: routeOf(op) }])),
    ]),
  ) as unknown as Routes<T>;

// ---------- wire ----------
// The declarations' schemas need no services; the `as` drops the `any` services `Schema.Top` carries.
const Json = (s: Schema.Top) => Schema.toCodecJson(s) as unknown as Schema.Codec<unknown, unknown>;
const Strings = (s: Schema.Top) => Schema.toCodecStringTree(s) as unknown as Schema.Codec<unknown, unknown>;
const encodeError = (op: AnyNamed, e: { readonly _tag: string }) => {
  const cls = op.errors.find((c) => nameOfError(c) === e._tag);
  if (!cls) return undefined;
  return Schema.encodeUnknownEffect(Json(cls.schema))(e).pipe(
    Effect.map((fields) => ({ _tag: e._tag, fields })),
  );
};

// ---------- server ----------
export const makeServer = <T extends Ops>(ops: T, handlers: HandlerSet<T>) => {
  const table = new Map<string, Handler>();
  for (const op of flatten(ops)) table.set(routeOf(op), (handlers as any)[op.thingName][op.verb]);
  return (req: Request): Promise<Response> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const path = new URL(req.url).pathname;
        const h = table.get(path);
        if (!h || req.method !== "POST") return Response.json({ kind: "not-found", path }, { status: 404 });
        const body: unknown = yield* Effect.promise(() => req.json());
        const payload = yield* Schema.decodeUnknownEffect(Json(h.op.payload))(body).pipe(Effect.option);
        if (payload._tag === "None") return Response.json({ kind: "bad-payload" }, { status: 400 });
        return yield* h.run(payload.value as never).pipe(
          Effect.flatMap((answer) => Schema.encodeUnknownEffect(Json(h.op.answer))(answer)),
          Effect.map((answer) => Response.json({ kind: "answer", answer })),
          Effect.catch((e: unknown) => {
            const enc = typeof e === "object" && e && "_tag" in e ? encodeError(h.op, e as { _tag: string }) : undefined;
            return enc
              ? Effect.map(enc, (error) => Response.json({ kind: "refusal", error }, { status: 422 }))
              : Effect.succeed(Response.json({ kind: "defect" }, { status: 500 }));
          }),
        );
      }),
    );
};

// ---------- client ----------
export class TransportError extends Error {
  readonly _tag = "TransportError" as const;
}
export type Call<O extends AnyNamed> = (payload: PayloadOf<O>) => Effect.Effect<AnswerOf<O>, ErrorOf<O> | TransportError>;
export type Client<T extends Ops> = { readonly [Th in keyof T]: { readonly [V in keyof T[Th]]: Call<T[Th][V]> } };

const call =
  (fetcher: (req: Request) => Promise<Response>, base: string, op: AnyNamed) =>
  (payload: unknown): Effect.Effect<unknown, unknown> =>
    Effect.gen(function* () {
      const body = yield* Schema.encodeUnknownEffect(Json(op.payload))(payload).pipe(
        Effect.mapError((e) => new TransportError(String(e))),
      );
      const res = yield* Effect.tryPromise({
        try: () => fetcher(new Request(base + routeOf(op), { method: "POST", body: JSON.stringify(body) })),
        catch: (e) => new TransportError(String(e)),
      });
      const msg = (yield* Effect.promise(() => res.json())) as {
        kind: string;
        answer?: unknown;
        error?: { _tag: string; fields: unknown };
      };
      if (msg.kind === "answer")
        return yield* Schema.decodeUnknownEffect(Json(op.answer))(msg.answer).pipe(
          Effect.mapError((e) => new TransportError(String(e))),
        );
      const cls: AnyErrorClass | undefined = msg.error && op.errors.find((c) => nameOfError(c) === msg.error!._tag);
      if (!cls) return yield* Effect.fail(new TransportError(`unexpected ${msg.kind} (${res.status})`));
      const fields = yield* Schema.decodeUnknownEffect(Json(cls.schema))(msg.error!.fields).pipe(
        Effect.mapError((e) => new TransportError(String(e))),
      );
      return yield* Effect.fail(new cls(fields));
    });

export const makeClient = <T extends Ops>(ops: T, fetcher: (req: Request) => Promise<Response>, base = "http://in-process"): Client<T> =>
  Object.fromEntries(
    Object.entries(ops).map(([th, verbs]) => [
      th,
      Object.fromEntries(Object.entries(verbs).map(([v, op]) => [v, call(fetcher, base, op)])),
    ]),
  ) as unknown as Client<T>;

// ---------- CLI ----------
export type CommandOf<P extends string, O extends AnyNamed> = `${P} ${O["thingName"]} ${O["verb"]}`;
export type Commands<P extends string, T extends Ops> = {
  [Th in keyof T]: { [V in keyof T[Th]]: CommandOf<P, T[Th][V]> }[keyof T[Th]];
}[keyof T];
export const commands = <const P extends string, T extends Ops>(program: P, ops: T): ReadonlyArray<Commands<P, T>> =>
  flatten(ops).map((op) => `${program} ${op.thingName} ${op.verb}` as Commands<P, T>);

/** `acme <thing> <verb> --field value ...`: flags decoded with the payload's StringTree codec. */
export const runCli = <T extends Ops>(ops: T, client: Client<T>, argv: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const [th, v, ...rest] = argv;
    const op = th && v ? (ops[th]?.[v] as AnyNamed | undefined) : undefined;
    if (!op) return yield* Effect.fail(new TransportError(`unknown command: ${argv.join(" ")}`));
    const flags: Record<string, string> = {};
    for (let i = 0; i < rest.length; i += 2) flags[rest[i]!.replace(/^--/, "")] = rest[i + 1]!;
    const payload = yield* Schema.decodeUnknownEffect(Strings(op.payload))(flags).pipe(
      Effect.mapError((e) => new TransportError(String(e))),
    );
    return yield* ((client as any)[th!][v!] as (p: unknown) => Effect.Effect<unknown, unknown>)(payload);
  });
```

### compile.ts
```ts
// Reads blueprint/ and writes generated/. Names come from paths (things, verbs) and export names (errors).
// `bun compile.ts` writes; `bun compile.ts --check` fails if writing would change any file.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname);
const thingsDir = join(root, "blueprint/things");
const genDir = join(root, "generated");
const HEADER = "// Generated from the blueprint. Do not edit.\n";
const IDENT = /^[a-z][a-zA-Z0-9]*$/;
const ERROR_IDENT = /^[A-Z][a-zA-Z0-9]*$/;

const fail = (msg: string): never => {
  console.error(`compile: ${msg}`);
  return process.exit(1);
};
const sorted = (dir: string, pred: (name: string) => boolean = () => true) =>
  existsSync(dir) ? readdirSync(dir).filter(pred).sort() : [];
const load = async (file: string) => (await import(pathToFileURL(file).href)) as Record<string, unknown>;
const rel = (from: string, file: string) => {
  const r = relative(from, file).replaceAll("\\", "/");
  return r.startsWith(".") ? r : `./${r}`;
};

interface Op { thing: string; verb: string; file: string }
interface Err { thing: string; name: string; file: string }
interface Th { name: string; file: string; ops: Op[] }

const things: Th[] = [];
const errors: Err[] = [];
for (const name of sorted(thingsDir)) {
  if (!IDENT.test(name)) fail(`thing folder "${name}" is not a camelCase identifier`);
  const file = join(thingsDir, name, "thing.ts");
  if (!existsSync(file)) fail(`blueprint/things/${name} has no thing.ts`);
  const thing = (await load(file)).default as { kind?: string } | undefined;
  if (thing?.kind !== "thing") fail(`blueprint/things/${name}/thing.ts must default-export Blueprint.thing(...)`);
  const ops: Op[] = [];
  for (const f of sorted(join(thingsDir, name, "verbs"), (f) => f.endsWith(".ts"))) {
    const verb = f.slice(0, -3);
    if (!IDENT.test(verb)) fail(`verb file "${name}/verbs/${f}" is not a camelCase identifier`);
    const opFile = join(thingsDir, name, "verbs", f);
    const op = (await load(opFile)).default as { kind?: string; thing?: unknown } | undefined;
    if (op?.kind !== "operation") fail(`${name}/verbs/${f} must default-export Blueprint.operation(...)`);
    if (op!.thing !== thing) fail(`${name}/verbs/${f} declares an operation of another thing; move it under its thing`);
    ops.push({ thing: name, verb, file: opFile });
  }
  const errFile = join(thingsDir, name, "errors.ts");
  if (existsSync(errFile)) {
    const mod = await load(errFile);
    for (const exp of Object.keys(mod).sort()) {
      const v = mod[exp] as { fields?: unknown; schema?: unknown } | undefined;
      if (typeof v !== "function" || !("fields" in v) || !("schema" in v)) continue;
      if (!ERROR_IDENT.test(exp)) fail(`error ${exp} must be PascalCase`);
      const dup = errors.find((e) => e.name === exp);
      if (dup) fail(`error ${exp} is declared by both ${dup.thing} and ${name}`);
      errors.push({ thing: name, name: exp, file: errFile });
    }
  }
  things.push({ name, file, ops });
}

const program = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string }).name;
const id = (o: Op) => `${o.thing}_${o.verb}`;
const allOps = things.flatMap((t) => t.ops);

// ---------- generated/index.ts ----------
const errFiles = [...new Set(errors.map((e) => e.file))];
const errAlias = (file: string) => `errors_${things.find((t) => join(thingsDir, t.name, "errors.ts") === file)!.name}`;
const index = [
  HEADER,
  `import { handlerSlots, named, nameError } from "../blueprint-lib.ts";`,
  `import { commands as commandsOf, routes as routesOf } from "../runtime.ts";`,
  ...allOps.map((o) => `import ${id(o)} from "${rel(genDir, o.file)}";`),
  ...errFiles.map((f) => `import * as ${errAlias(f)} from "${rel(genDir, f)}";`),
  ``,
  `// Each error's name is its export name: stamped at runtime and narrowed in its type.`,
  ...errors.map((e) => `nameError(${errAlias(e.file)}.${e.name}, "${e.name}");`),
  ...errFiles.map((f) =>
    [
      `declare module "${rel(genDir, f)}" {`,
      ...errors.filter((e) => e.file === f).map((e) => `  interface ${e.name} { readonly _tag: "${e.name}" }`),
      `}`,
    ].join("\n"),
  ),
  ``,
  `export const operations = {`,
  ...things.map((t) =>
    [`  ${t.name}: {`, ...t.ops.map((o) => `    ${o.verb}: named(${id(o)}, "${o.thing}", "${o.verb}"),`), `  },`].join(
      "\n",
    ),
  ),
  `} as const;`,
  ``,
  `export const operationsByName = {`,
  ...allOps.map((o) => `  "${o.thing}.${o.verb}": operations.${o.thing}.${o.verb},`),
  `} as const;`,
  ``,
  `export const program = "${program}";`,
  `export const Handlers = handlerSlots(operations);`,
  `export const routes = routesOf(operations);`,
  `export const commands = commandsOf(program, operations);`,
  ``,
].join("\n");

// ---------- generated/server.ts ----------
const implDir = join(root, "implementation/handlers");
const server = [
  HEADER,
  `import type { HandlerSet } from "../blueprint-lib.ts";`,
  `import { makeServer } from "../runtime.ts";`,
  `import { operations } from "./index.ts";`,
  ...allOps.map((o) => `import ${id(o)} from "${rel(genDir, join(implDir, o.thing, `${o.verb}.ts`))}";`),
  ``,
  `export const handlers: HandlerSet<typeof operations> = {`,
  ...things.map((t) => [`  ${t.name}: {`, ...t.ops.map((o) => `    ${o.verb}: ${id(o)},`), `  },`].join("\n")),
  `};`,
  ``,
  `export const server = makeServer(operations, handlers);`,
  ``,
].join("\n");

const outputs: Record<string, string> = { "index.ts": index, "server.ts": server };
const check = process.argv.includes("--check");
let stale = 0;
mkdirSync(genDir, { recursive: true });
for (const f of sorted(genDir)) {
  if (!(f in outputs)) {
    stale++;
    console.error(`compile: generated/${f} is not written by the compiler`);
  }
}
for (const [f, text] of Object.entries(outputs)) {
  const path = join(genDir, f);
  const old = existsSync(path) ? readFileSync(path, "utf8") : undefined;
  if (old === text) continue;
  stale++;
  if (check) console.error(`compile: generated/${f} is stale; run the compiler`);
  else writeFileSync(path, text);
}
if (check && stale) process.exit(1);
console.log(`compile: ${allOps.length} operations, ${errors.length} errors, ${check ? "checked" : "written"}`);
```

### blueprint/values.ts
```ts
import * as Schema from "effect/Schema";

export const Amount = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));
export const Id = Schema.NonEmptyString;
export const OrgName = Schema.NonEmptyString;
```

### blueprint/things/allowance/thing.ts
```ts
import * as Blueprint from "../../../blueprint-lib.ts";
import { Amount, Id } from "../../values.ts";

export default Blueprint.thing({ id: Id, organization: Id, limit: Amount, spent: Amount });
```

### blueprint/things/allowance/errors.ts
```ts
import * as Blueprint from "../../../blueprint-lib.ts";
import { Amount, Id } from "../../values.ts";

/** The amount asked is more than the allowance has left. */
export class AllowanceExceeded extends Blueprint.error({ allowance: Id, remaining: Amount, asked: Amount }) {}
/** No allowance has this id. */
export class AllowanceNotFound extends Blueprint.error({ allowance: Id }) {}
```

### blueprint/things/allowance/verbs/grant.ts
```ts
import * as Blueprint from "../../../../blueprint-lib.ts";
import { OrganizationNotFound } from "../../organization/errors.ts";
import Organization from "../../organization/thing.ts";
import { Amount } from "../../../values.ts";
import Allowance from "../thing.ts";

export default Blueprint.operation(Allowance, {
  payload: { organization: Organization.fields.id, limit: Amount },
  answer: { allowance: Allowance.fields.id },
  errors: [OrganizationNotFound],
});
```

### blueprint/things/allowance/verbs/spend.ts
```ts
import * as Blueprint from "../../../../blueprint-lib.ts";
import { Amount } from "../../../values.ts";
import { AllowanceExceeded, AllowanceNotFound } from "../errors.ts";
import Allowance from "../thing.ts";

export default Blueprint.operation(Allowance, {
  payload: { allowance: Allowance.fields.id, amount: Amount },
  answer: { remaining: Amount },
  errors: [AllowanceExceeded, AllowanceNotFound],
});
```

### blueprint/things/organization/thing.ts
```ts
import * as Blueprint from "../../../blueprint-lib.ts";
import { Id, OrgName } from "../../values.ts";

export default Blueprint.thing({ id: Id, name: OrgName });
```

### blueprint/things/organization/errors.ts
```ts
import * as Blueprint from "../../../blueprint-lib.ts";
import { Id, OrgName } from "../../values.ts";

/** Another organization already has this name. */
export class OrganizationNameTaken extends Blueprint.error({ name: OrgName }) {}
/** No organization has this id. */
export class OrganizationNotFound extends Blueprint.error({ organization: Id }) {}
```

### blueprint/things/organization/verbs/create.ts
```ts
import * as Blueprint from "../../../../blueprint-lib.ts";
import { OrganizationNameTaken } from "../errors.ts";
import Organization from "../thing.ts";

export default Blueprint.operation(Organization, {
  payload: { name: Organization.fields.name },
  answer: { organization: Organization.fields.id },
  errors: [OrganizationNameTaken],
});
```

### implementation/store.ts
```ts
// An in-memory store, enough for the spike.
export const store = {
  organizations: new Map<string, { id: string; name: string }>(),
  allowances: new Map<string, { id: string; organization: string; limit: number; spent: number }>(),
  next: 0,
};
export const nextId = (prefix: string) => `${prefix}_${++store.next}`;
```

### implementation/handlers/organization/create.ts
```ts
import * as Effect from "effect/Effect";
import { OrganizationNameTaken } from "../../../blueprint/things/organization/errors.ts";
import { Handlers } from "../../../generated/index.ts";
import { nextId, store } from "../../store.ts";

export default Handlers.organization.create(({ name }) =>
  Effect.gen(function* () {
    for (const o of store.organizations.values())
      if (o.name === name) return yield* new OrganizationNameTaken({ name });
    const id = nextId("org");
    store.organizations.set(id, { id, name });
    return { organization: id };
  }),
);
```

### implementation/handlers/allowance/grant.ts
```ts
import * as Effect from "effect/Effect";
import { OrganizationNotFound } from "../../../blueprint/things/organization/errors.ts";
import { Handlers } from "../../../generated/index.ts";
import { nextId, store } from "../../store.ts";

export default Handlers.allowance.grant(({ organization, limit }) =>
  Effect.gen(function* () {
    if (!store.organizations.has(organization)) return yield* new OrganizationNotFound({ organization });
    const id = nextId("alw");
    store.allowances.set(id, { id, organization, limit, spent: 0 });
    return { allowance: id };
  }),
);
```

### implementation/handlers/allowance/spend.ts
```ts
import * as Effect from "effect/Effect";
import { AllowanceExceeded, AllowanceNotFound } from "../../../blueprint/things/allowance/errors.ts";
import { Handlers } from "../../../generated/index.ts";
import { store } from "../../store.ts";

export default Handlers.allowance.spend(({ allowance, amount }) =>
  Effect.gen(function* () {
    const a = store.allowances.get(allowance);
    if (!a) return yield* new AllowanceNotFound({ allowance });
    const remaining = a.limit - a.spent;
    if (amount > remaining) return yield* new AllowanceExceeded({ allowance, remaining, asked: amount });
    a.spent += amount;
    return { remaining: a.limit - a.spent };
  }),
);
```

### test/e2e.ts
```ts
// End to end, in process: client -> Request -> server route -> handler -> Response -> client, and the CLI.
import * as Effect from "effect/Effect";
import { commands, operations, routes } from "../generated/index.ts";
import { server } from "../generated/server.ts";
import { makeClient, runCli } from "../runtime.ts";

const client = makeClient(operations, server);
const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok: ${msg}`);
};

const program = Effect.gen(function* () {
  console.log("routes:", JSON.stringify(routes));
  console.log("commands:", commands);

  const { organization } = yield* client.organization.create({ name: "Acme" });
  const { allowance } = yield* client.allowance.grant({ organization, limit: 100 });
  const { remaining } = yield* client.allowance.spend({ allowance, amount: 30 });
  const r: number = remaining; // typed answer
  assert(r === 70, `spend answers remaining 70 (got ${r})`);

  // A refusal arrives as a typed error; catchTag only accepts tags the operation declares.
  const refused = yield* client.allowance.spend({ allowance, amount: 500 }).pipe(
    Effect.map(() => "answered" as const),
    Effect.catchTag("AllowanceExceeded", (e) => Effect.succeed(`refused: remaining ${e.remaining}, asked ${e.asked}`)),
    Effect.catchTag("AllowanceNotFound", () => Effect.succeed("not found")),
  );
  assert(refused === "refused: remaining 70, asked 500", `over-spend is AllowanceExceeded (${refused})`);

  const dup = yield* client.organization.create({ name: "Acme" }).pipe(
    Effect.flip,
    Effect.map((e) => e._tag),
  );
  assert(dup === "OrganizationNameTaken", `duplicate name is OrganizationNameTaken (${dup})`);

  const viaCli = yield* runCli(operations, client, ["allowance", "spend", "--allowance", allowance, "--amount", "20"]);
  assert(JSON.stringify(viaCli) === `{"remaining":50}`, `CLI '${commands[1]} --amount 20' answers ${JSON.stringify(viaCli)}`);
});

Effect.runPromise(program).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### test/types.ts
```ts
// Type-level proofs: this file must compile. Each @ts-expect-error line must fail to compile, or tsc reports it.
import * as Effect from "effect/Effect";
import { commands, Handlers, operations, routes } from "../generated/index.ts";
import { server } from "../generated/server.ts";
import { makeClient } from "../runtime.ts";
import { AllowanceExceeded } from "../blueprint/things/allowance/errors.ts";
import { OrganizationNameTaken } from "../blueprint/things/organization/errors.ts";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const yes = <T extends true>() => {};

// The names exist only as types derived from generated/index.ts.
yes<Equal<typeof operations.allowance.spend.name, "allowance.spend">>();
yes<Equal<typeof routes.allowance.spend.path, "/allowance/spend">>();
yes<Equal<(typeof commands)[number], "acme allowance grant" | "acme allowance spend" | "acme organization create">>();

const client = makeClient(operations, server);
type SpendCall = typeof client.allowance.spend;
yes<Equal<Parameters<SpendCall>[0], { readonly allowance: string; readonly amount: number }>>();
yes<Equal<Effect.Success<ReturnType<SpendCall>>, { readonly remaining: number }>>();
yes<Equal<Effect.Error<ReturnType<SpendCall>>["_tag"], "AllowanceExceeded" | "AllowanceNotFound" | "TransportError">>();

// @ts-expect-error a typo'd verb is not a slot
Handlers.allowance.spnd;
// @ts-expect-error a typo'd thing is not a client namespace
client.alowance;
// @ts-expect-error catchTag refuses a tag the operation does not declare
client.allowance.spend({ allowance: "a", amount: 1 }).pipe(Effect.catchTag("OrganizationNameTaken", () => Effect.void));
// @ts-expect-error the payload is checked
client.allowance.spend({ allowance: "a", amount: "1" });

// @ts-expect-error an answer with a field the blueprint does not declare
Handlers.allowance.spend(() => Effect.succeed({ remaining: 1, bonus: 2 }));
// @ts-expect-error an answer missing a declared field
Handlers.allowance.spend(() => Effect.succeed({}));
// @ts-expect-error failing with an error the operation does not declare (even one with a declared name elsewhere)
Handlers.allowance.spend(() => Effect.fail(new OrganizationNameTaken({ name: "x" })));
// A declared error is fine.
Handlers.allowance.spend(() => Effect.fail(new AllowanceExceeded({ allowance: "a", remaining: 0, asked: 1 })));
```

### generated/index.ts (written by `bun compile.ts`)
```ts
// Generated from the blueprint. Do not edit.

import { handlerSlots, named, nameError } from "../blueprint-lib.ts";
import { commands as commandsOf, routes as routesOf } from "../runtime.ts";
import allowance_grant from "../blueprint/things/allowance/verbs/grant.ts";
import allowance_spend from "../blueprint/things/allowance/verbs/spend.ts";
import organization_create from "../blueprint/things/organization/verbs/create.ts";
import * as errors_allowance from "../blueprint/things/allowance/errors.ts";
import * as errors_organization from "../blueprint/things/organization/errors.ts";

// Each error's name is its export name: stamped at runtime and narrowed in its type.
nameError(errors_allowance.AllowanceExceeded, "AllowanceExceeded");
nameError(errors_allowance.AllowanceNotFound, "AllowanceNotFound");
nameError(errors_organization.OrganizationNameTaken, "OrganizationNameTaken");
nameError(errors_organization.OrganizationNotFound, "OrganizationNotFound");
declare module "../blueprint/things/allowance/errors.ts" {
  interface AllowanceExceeded { readonly _tag: "AllowanceExceeded" }
  interface AllowanceNotFound { readonly _tag: "AllowanceNotFound" }
}
declare module "../blueprint/things/organization/errors.ts" {
  interface OrganizationNameTaken { readonly _tag: "OrganizationNameTaken" }
  interface OrganizationNotFound { readonly _tag: "OrganizationNotFound" }
}

export const operations = {
  allowance: {
    grant: named(allowance_grant, "allowance", "grant"),
    spend: named(allowance_spend, "allowance", "spend"),
  },
  organization: {
    create: named(organization_create, "organization", "create"),
  },
} as const;

export const operationsByName = {
  "allowance.grant": operations.allowance.grant,
  "allowance.spend": operations.allowance.spend,
  "organization.create": operations.organization.create,
} as const;

export const program = "acme";
export const Handlers = handlerSlots(operations);
export const routes = routesOf(operations);
export const commands = commandsOf(program, operations);
```

### generated/server.ts (written by `bun compile.ts`)
```ts
// Generated from the blueprint. Do not edit.

import type { HandlerSet } from "../blueprint-lib.ts";
import { makeServer } from "../runtime.ts";
import { operations } from "./index.ts";
import allowance_grant from "../implementation/handlers/allowance/grant.ts";
import allowance_spend from "../implementation/handlers/allowance/spend.ts";
import organization_create from "../implementation/handlers/organization/create.ts";

export const handlers: HandlerSet<typeof operations> = {
  allowance: {
    grant: allowance_grant,
    spend: allowance_spend,
  },
  organization: {
    create: organization_create,
  },
};

export const server = makeServer(operations, handlers);
```

### tsc output for each proof

**Proof 1** (a throwaway `test/bad.ts`, deleted afterwards):
```
test/bad.ts(5,20): error TS2551: Property 'spnd' does not exist on type '{ readonly grant: Slot<…"allowance", "grant">>; readonly spend: Slot<...>; }'. Did you mean 'spend'?
test/bad.ts(3,26): error TS2345: Argument of type '() => Effect.Effect<{ remaining: number; bonus: number; }, never, never>' is not assignable to parameter of type '((payload: { readonly allowance: string; readonly amount: number; }) => Effect<…>) & { readonly "answer fields not in the blueprint": "bonus"; }'.
test/bad.ts(8,3): error TS2375: Type 'Effect<{ remaining: number; }, OrganizationNameTaken, never>' is not assignable to type 'Effect<{ remaining: number; }, AllowanceExceeded | AllowanceNotFound, never>' …
```
These lines come from two runs of `test/bad.ts`, which is why the line numbers are not in order. The first two lines show the typo check and the undeclared-error check from the first run. The extra-field line shows the message from the second run, after `Slot` was changed to name the field; the first run gave only "Expected 2 arguments". `test/types.ts` holds the same three checks permanently, as `@ts-expect-error` lines, and `tsc` passes with them.

**Proof 2** (after renaming `spend.ts` to `withdraw.ts` and recompiling, before moving the handler):
```
generated/server.ts(7,32): error TS2307: Cannot find module '../implementation/handlers/allowance/withdraw.ts'
implementation/handlers/allowance/spend.ts(6,35): error TS2339: Property 'spend' does not exist on type '{ readonly grant: …; readonly withdraw: Slot<...>; }'.
test/e2e.ts(19,49): error TS2339: Property 'spend' does not exist on type '{ …; readonly withdraw: Call<...>; }'.
```
After the handler file was moved and `.spend` changed to `.withdraw`, only the callers in `test/` still failed. Running it gave:
- route `/allowance/withdraw`;
- commands `["acme allowance grant","acme allowance withdraw","acme organization create"]`;
- `client.allowance.withdraw` answered `{ remaining: 70 }`;
- `acme allowance withdraw` answered `{ remaining: 65 }`;
- `acme allowance spend` was refused with `unknown command`.

Before recompiling, `compile.ts --check` printed `generated/index.ts is stale` and exited with 1. Everything was then reverted, and `tsc` exited with 0.

**Proof 3** (`bun test/e2e.ts`):
```
ok: spend answers remaining 70 (got 70)
ok: over-spend is AllowanceExceeded (refused: remaining 70, asked 500)
ok: duplicate name is OrganizationNameTaken (OrganizationNameTaken)
ok: CLI 'acme allowance spend --amount 20' answers {"remaining":50}
```

**Proof 4** (grep for the quoted name strings, outside `node_modules`):
```
./generated/index.ts:28:    spend: named(allowance_spend, "allowance", "spend"),
./generated/index.ts:37:  "allowance.spend": operations.allowance.spend,
./test/e2e.ts:37:  … runCli(operations, client, ["allowance", "spend", …])
./test/types.ts:13:yes<Equal<typeof operations.allowance.spend.name, "allowance.spend">>();
./test/types.ts:14:yes<Equal<typeof routes.allowance.spend.path, "/allowance/spend">>();
```
None appear in `blueprint/`, `implementation/`, `blueprint-lib.ts` or `runtime.ts`. The handler uses `.spend` as an identifier, and the compiler checks it.

**Proof 5** (inference, editor performance, keeping in sync):
- Two inference problems came up and were fixed. An `Effect.fail`-only handler infers its answer as `never`, and `keyof never` falsely reported every key as an extra answer field; the `[A2] extends [never]` guard fixes it. Answers are checked exactly by the intersection trick in `Slot`.
- A third problem was found and worked around: a field called `name` on an error broke at runtime until the prototype's `_tag` was made writable and `name` was left alone.
- Effect's `Schema.Top` carries `any` services, which leak into `R` under `exactOptionalPropertyTypes`. `runtime.ts` casts its codecs to `Codec<unknown, unknown>`.
- Cost and sync are as in the README: a 0.4 s check, long error messages, and `--check` in CI plus a watch or an Nx sync generator.