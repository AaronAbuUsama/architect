#!/usr/bin/env node
// The architect command. The only file here that reads the process, prints or exits.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { Build, Environments, Impact, Prove, Worlds } from "@architect/prove";
import { ModelCommand } from "#modules/model/service.js";
import { Add } from "#modules/add/service.js";
import { AddRefused, type What } from "#modules/add/types.js";
import { Check } from "#modules/check/service.js";
import { Generate } from "#modules/generate/service.js";
import { Brief } from "#modules/brief/service.js";
import { Compiler, nodeSource } from "@architect/compiler";

const model = Command.make(
  "model",
  {
    json: Flag.Boolean("json").pipe(Flag.withDefault(false)),
    root: Flag.String("root").pipe(Flag.withDefault(process.cwd())),
  },
  ({ json, root }) =>
    ModelCommand.run({ root, json }).pipe(
      Effect.tap((said) => (said.out ? Effect.sync(() => process.stdout.write(said.out)) : Effect.void)),
      Effect.tap((said) => (said.err ? Console.error(said.err.trimEnd()) : Effect.void)),
      Effect.tap((said) => Effect.sync(() => (process.exitCode = said.exit))),
    ),
);

const dev = Command.make(
  "dev",
  {
    root: Flag.String("root").pipe(Flag.withDefault(process.cwd())),
    port: Flag.Int("port").pipe(Flag.withDefault(8787)),
  },
  ({ root, port }) =>
    Effect.scoped(
      Worlds.start({ root, port, name: "dev" }).pipe(
        Effect.tap(({ url, log }) => Console.log(`running at ${url}  (world at ${url}/_world, wrangler output in ${log})`)),
        Effect.andThen(Effect.never),
      ),
    ).pipe(Effect.catchTag("WorldFailed", (e) => Console.error(e.message).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = 1)))))),
);

const prove = Command.make(
  "prove",
  {
    env: Flag.Literals("env", ["local"]).pipe(Flag.withDefault("local")),
    root: Flag.String("root").pipe(Flag.withDefault(process.cwd())),
    port: Flag.Int("port").pipe(Flag.withDefault(8799)),
  },
  ({ root, port }) =>
    Effect.scoped(Prove.run({ root, port })).pipe(
      Effect.tap((report) => Effect.sync(() => process.stdout.write(report.lines.join("\n") + "\n"))),
      Effect.tap((report) => Effect.sync(() => (process.exitCode = report.passed ? 0 : 1))),
      Effect.catchTag("ProveFailed", (e) => Console.error(`prove couldn't run: ${e.message}`).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = 2))))),
    ),
);

const fail = (message: string, exit: number) => Console.error(message).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = exit))));

// `architect add <what> <name>`: writes the planned files, or with --dry-run prints them and writes nothing.
const addOne = (what: What) =>
  Command.make(
    what,
    {
      name: Argument.String("name"),
      dryRun: Flag.Boolean("dry-run").pipe(Flag.withDefault(false)),
      root: Flag.String("root").pipe(Flag.withDefault(process.cwd())),
    },
    ({ name, dryRun, root }) => {
      const planned = Add.plan(what, name, (path) => existsSync(join(root, path)));
      if (planned instanceof AddRefused) return fail(planned.message, 2);
      return Effect.sync(() => {
        for (const f of planned) {
          if (dryRun) process.stdout.write(`--- ${f.path}\n${f.content}`);
          else {
            mkdirSync(dirname(join(root, f.path)), { recursive: true });
            writeFileSync(join(root, f.path), f.content);
            process.stdout.write(`wrote ${f.path}\n`);
          }
        }
        if (dryRun) process.stdout.write(`(dry run: ${planned.length} files, nothing written)\n`);
      });
    },
  );
const add = Command.make("add").pipe(Command.withSubcommands([addOne("thing"), addOne("operation"), addOne("read"), addOne("journey")]));

const tsFiles = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? tsFiles(join(dir, d.name)) : d.name.endsWith(".ts") ? [join(dir, d.name)] : [])) : [];

const check = Command.make(
  "check",
  { root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ root }) =>
    Check.run(root).pipe(
      Effect.tap((said) => Effect.sync(() => {
        process.stdout.write(said.lines.join("\n") + "\n");
        process.exitCode = said.passed ? 0 : 1;
      })),
    ),
);

const generate = Command.make(
  "generate",
  { root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ root }) =>
    Generate.run(root).pipe(
      Effect.tap((changes) => Effect.sync(() => process.stdout.write(Generate.lines(changes).join("\n") + "\n"))),
      Effect.catchTag("ModelFailed", (e) => fail(e.problems, 2)),
    ),
);

const impact = Command.make(
  "impact",
  { root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ root }) =>
    Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.flatMap((m) => Impact.of(root, m)),
      Effect.flatMap((said) => Effect.sync(() => process.stdout.write(Impact.lines(said).join("\n") + "\n"))),
      Effect.catchTags({ BlueprintInvalid: (e) => fail(e.problems.join("\n"), 2), SourceError: (e) => fail(e.message, 2) }),
    ),
);

const brief = Command.make(
  "brief",
  { operation: Argument.String("operation"), root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ operation, root }) =>
    Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.flatMap((m) => {
        const journeys = [...tsFiles(join(root, "blueprint/journeys")), ...tsFiles(join(root, "journeys"))]
          .map((f) => ({ path: relative(root, f), text: readFileSync(f, "utf8") }));
        const said = Brief.of(m, operation, journeys);
        return "unknown" in said ? fail(said.unknown, 2) : Effect.sync(() => process.stdout.write(said.lines.join("\n") + "\n"));
      }),
      Effect.catchTags({ BlueprintInvalid: (e) => fail(e.problems.join("\n"), 2), SourceError: (e) => fail(e.message, 2) }),
    ),
);

// `architect build`: the revision's bundle, once. Every environment runs this file unchanged (D3 #6).
const build = Command.make(
  "build",
  { root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ root }) =>
    Build.build(root).pipe(
      Effect.tap((b) => (b.dirty ? Console.error(`warning: the working tree differs from ${b.revision}, so this bundle is not that commit's source`) : Effect.void)),
      Effect.tap((b) => Console.log(`built ${b.revision} sha256:${b.sha256}`)),
      Effect.catchTag("BuildFailed", (e) => fail(e.message, 2)),
    ),
);

// `architect env up|down|status <env>`: a long-lived local environment (D3 #4).
const environment = (verb: "up" | "down" | "status") =>
  Command.make(
    verb,
    {
      env: Argument.String("env"),
      port: Flag.optional(Flag.Int("port")),
      revision: Flag.optional(Flag.String("revision")),
      root: Flag.String("root").pipe(Flag.withDefault(process.cwd())),
    },
    ({ env, port, revision, root }) => {
      const name = { root, name: env };
      const said =
        verb === "up"
          ? Environments.up({ ...name, ...(Option.isSome(port) ? { port: port.value } : {}), ...(Option.isSome(revision) ? { revision: revision.value } : {}) }).pipe(Effect.map((s) => `${env} up ${s.url}`))
          : verb === "down"
            ? Environments.down(name).pipe(Effect.map(() => `${env} down`))
            : Environments.status(name).pipe(Effect.map((s) => (s.state === "up" ? `${env} up ${s.url}` : `${env} down`)));
      return said.pipe(Effect.flatMap(Console.log), Effect.catchTag("EnvironmentFailed", (e) => fail(e.message, 2)));
    },
  );
const env = Command.make("env").pipe(Command.withSubcommands([environment("up"), environment("down"), environment("status")]));

Command.make("architect").pipe(
  Command.withSubcommands([model, dev, prove, add, check, generate, brief, impact, build, env]),
  Command.run({ version: "0.0.0" }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
