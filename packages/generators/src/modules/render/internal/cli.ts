// generated/cli: `<project> <thing> <verb> --<field> ...`, one command per operation, calling the SDK.
import type { Model, OperationModel } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, camel, lines, opVar } from "./names.ts";

const command = (op: OperationModel): RenderedFile => {
  const optional = Object.values(op.payload).some((f) => f.optional);
  return {
    path: `generated/cli/src/${op.thing}/${op.verb}.ts`,
    scaffold: false,
    content: lines(
      GENERATED,
      `import { Effect, Schema } from "effect";`,
      `import { Command, Flag } from "effect/cli";`,
      `import { declaration } from "../../../api/src/${op.thing}/${op.verb}.ts";`,
      `import * as Sdk from "../../../sdk/src/index.ts";`,
      `import { answer${optional ? ", supplied" : ""} } from "../output.ts";`,
      "",
      `/** ${op.description} Every flag is text; the declaration decodes it${optional ? "; a flag left out is not sent" : ""}. \`--json\` prints the whole answer as JSON. */`,
      `export const ${camel(op.verb)} = Command.make(`,
      `  "${op.verb}",`,
      `  { ${[...Object.entries(op.payload).map(([k, f]) => (f.optional ? `${k}: Flag.optional(Flag.String("${k}"))` : `${k}: Flag.String("${k}")`)), `json: Flag.Boolean("json").pipe(Flag.withDefault(false))`].join(", ")} },`,
      `  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(${optional ? "supplied(flags)" : "flags"}).pipe(Effect.flatMap(Sdk.${camel(op.thing)}.${camel(op.verb)}), answer(json)),`,
      ");",
    ),
  };
};

const output = (): RenderedFile => ({
  path: "generated/cli/src/output.ts",
  scaffold: false,
  content: lines(
    GENERATED,
    `import { Console, Context, Effect, Option } from "effect";`,
    `import { Errors } from "../../sdk/src/index.ts";`,
    "",
    "/** Set by the entry, so commands never touch the process. */",
    `export class ExitCode extends Context.Service<ExitCode, { readonly set: (code: number) => Effect.Effect<void> }>()("cli/ExitCode") {}`,
    "",
    "/** The flags the caller gave: an optional flag left out is `None`, and is not sent at all. */",
    "export const supplied = (flags: Readonly<Record<string, unknown>>) =>",
    "  Object.fromEntries(Object.entries(flags).flatMap(([k, v]) => (Option.isOption(v) ? (Option.isSome(v) ? [[k, v.value]] : []) : [[k, v]])));",
    "",
    "const text = (x: unknown) => JSON.stringify(x, (_, v: unknown) => (typeof v === \"bigint\" ? v.toString() : v));",
    "const exitOf = (tag: unknown): number =>",
    "  typeof tag === \"string\" && tag in Errors.exits ? Errors.exits[tag as keyof typeof Errors.exits] : tag === \"SchemaError\" ? 2 : 1;",
    "",
    "/**",
    " * A one-field answer prints its value, or with `json` the whole answer as JSON. A refusal prints its name and fields",
    " * to stderr and exits with its code.",
    " */",
    "export const answer = (json: boolean) => <A extends object, E, R>(effect: Effect.Effect<A, E, R>) =>",
    "  effect.pipe(",
    "    Effect.flatMap((a) => Console.log(!json && Object.keys(a).length === 1 ? String(Object.values(a)[0]) : text(a))),",
    "    Effect.catch((e: unknown) => {",
    "      const tag = typeof e === \"object\" && e !== null ? (e as { readonly _tag?: unknown })._tag : undefined;",
    "      const { _tag: _, ...fields } = (typeof e === \"object\" && e !== null ? e : {}) as Record<string, unknown>;",
    "      const said = tag === \"SchemaError\" ? String((e as { readonly message?: unknown }).message) : text(fields);",
    "      return Console.error(`${String(tag ?? \"Error\")}: ${said}`).pipe(",
    "        Effect.andThen(Effect.flatMap(ExitCode, (exit) => exit.set(exitOf(tag)))),",
    "      );",
    "    }),",
    "  );",
  ),
});

const main = (model: Model, name: string): RenderedFile => {
  const ops = Object.values(model.operations);
  const things = [...new Set(ops.map((o) => o.thing))];
  const env = name.toUpperCase().replace(/-/g, "_");
  return {
    path: "generated/cli/src/main.ts",
    scaffold: false,
    content: lines(
      "#!/usr/bin/env node",
      GENERATED,
      `// \`${name} <thing> <verb> --<field> <value>\`. Talks to ${env}_URL, signed in with ${env}_TOKEN when set.`,
      `import { NodeRuntime, NodeServices } from "@effect/platform-node";`,
      `import { Effect, Layer } from "effect";`,
      `import { Command } from "effect/cli";`,
      `import * as Sdk from "../../sdk/src/index.ts";`,
      `import { ExitCode } from "./output.ts";`,
      ops.map((o) => `import { ${camel(o.verb)} as ${opVar(o)} } from "./${o.thing}/${o.verb}.ts";`),
      "",
      things.map((t) => {
        const subs = ops.filter((o) => o.thing === t).map(opVar);
        return `const ${camel(t)} = Command.make("${t}").pipe(Command.withSubcommands([${subs.join(", ")}]));`;
      }),
      "",
      `Command.make("${name}").pipe(`,
      `  Command.withSubcommands([${things.map(camel).join(", ")}]),`,
      `  Command.run({ version: "0.0.0" }),`,
      `  Effect.provide(Sdk.layer(process.env["${env}_URL"] ?? "http://127.0.0.1:8787", process.env["${env}_TOKEN"])),`,
      "  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),",
      "  Effect.provide(NodeServices.layer),",
      "  NodeRuntime.runMain,",
      ");",
    ),
  };
};

export const renderCli = (model: Model, name: string): ReadonlyArray<RenderedFile> => [
  main(model, name),
  output(),
  ...Object.values(model.operations).map(command),
];
