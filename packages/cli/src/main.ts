#!/usr/bin/env node
// The architect command. The only file here that reads the process, prints or exits.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect } from "effect";
import { Command, Flag } from "effect/cli";
import { Prove, Worlds } from "@architect/prove";
import { ModelCommand } from "#modules/model/service.ts";

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

Command.make("architect").pipe(
  Command.withSubcommands([model, dev, prove]),
  Command.run({ version: "0.0.0" }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
