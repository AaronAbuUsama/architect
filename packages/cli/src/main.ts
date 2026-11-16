#!/usr/bin/env node
// The architect command. The only file here that reads the process, prints or exits.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, Option, Redacted } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { Build, Environments, Impact, Prove, ProveFailed, TestWorlds, Worlds, type TokenSource } from "@architect/prove";
import { ModelCommand } from "#modules/model/service.js";
import { Add } from "#modules/add/service.js";
import { AddRefused, type What } from "#modules/add/types.js";
import { Check } from "#modules/check/service.js";
import { Generate } from "#modules/generate/service.js";
import { Ship } from "#modules/ship/service.js";
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

const fail = (message: string, exit: number) => Console.error(message).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = exit))));

/** Where the logbook is (ARCHITECT_LOGBOOK_URL, else the running `logbook` environment) and who signs for the run (D3 #14, #54). */
const attestation = (root: string) =>
  Effect.gen(function* () {
    const issuer = process.env["ARCHITECT_OIDC_ISSUER"];
    const githubUrl = process.env["ACTIONS_ID_TOKEN_REQUEST_URL"];
    const githubToken = process.env["ACTIONS_ID_TOKEN_REQUEST_TOKEN"];
    const token: TokenSource | undefined = issuer
      ? { kind: "issuer", issuer, client: process.env["ARCHITECT_OIDC_CLIENT"] || "ci-main" }
      : githubUrl && githubToken
        ? { kind: "github", requestUrl: githubUrl, requestToken: Redacted.make(githubToken) }
        : undefined;
    if (!token) return yield* Effect.fail("no way to sign verdicts: set ARCHITECT_OIDC_ISSUER, or run in a GitHub Actions job with id-token: write");
    const given = process.env["ARCHITECT_LOGBOOK_URL"];
    const logbook = given ?? (yield* Environments.status({ root, name: "logbook" }).pipe(Effect.map((s) => (s.state === "up" ? s.url : undefined))));
    if (!logbook) return yield* Effect.fail("the logbook isn't running: `architect env up logbook`, or set ARCHITECT_LOGBOOK_URL");
    return { token, logbook };
  });

const prove = Command.make(
  "prove",
  {
    env: Flag.Literals("env", ["local", "test"]).pipe(Flag.withDefault("local")),
    root: Flag.String("root").pipe(Flag.withDefault(process.cwd())),
    port: Flag.Int("port").pipe(Flag.withDefault(8799)),
  },
  ({ env, root, port }) => {
    const proved = env === "test"
      ? attestation(root).pipe(
          Effect.flatMap(({ token, logbook }) => {
            const lifetime = process.env["ARCHITECT_LIFETIME"];
            return Prove.test({ root, logbook, token, ...(lifetime ? { lifetime } : {}), say: (line) => Console.log(line) });
          }),
          Effect.tap((report) => Effect.sync(() => (process.exitCode = report.passed ? 0 : 1))),
          Effect.catchTag("EnvironmentFailed", (e) => Effect.fail(new ProveFailed({ message: e.message }))),
        )
      : Effect.scoped(Prove.run({ root, port })).pipe(
          Effect.tap((report) => Effect.sync(() => process.stdout.write(report.lines.join("\n") + "\n"))),
          Effect.tap((report) => Effect.sync(() => (process.exitCode = report.passed ? 0 : 1))),
        );
    return proved.pipe(
      Effect.catchTag("ProveFailed", (e) => Console.error(`prove couldn't run: ${e.message}`).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = 2))))),
      Effect.catch((message: string) => fail(message, 2)),
    );
  },
);

const print = (said: { readonly out: string; readonly err: string; readonly exit: number }) =>
  Effect.sync(() => {
    if (said.out) process.stdout.write(said.out);
    if (said.err) process.stderr.write(said.err);
    process.exitCode = said.exit;
  });

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
      Effect.tap(() => Ship.changes({ root, env: process.env })),
      Effect.catchTag("ModelFailed", (e) => fail(e.problems, 2)),
    ),
);

// What a change does: the local ledger's lines, and with a logbook the next version and what is stale in staging and production.
const impact = Command.make(
  "impact",
  { root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ root }) => Ship.impact({ root, env: process.env }).pipe(Effect.flatMap(print)),
);

// `architect version --next`: the version the working model would release as, worked out from the last production release.
const version = Command.make(
  "version",
  { next: Flag.Boolean("next").pipe(Flag.withDefault(false)), root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ next, root }) => (next ? Ship.next({ root, env: process.env }).pipe(Effect.flatMap(print)) : fail("usage: architect version --next", 2)),
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
      // The logbook trusts one issuer, a repository, refs and workflows: from the environment, like a prove's token (D3 #33).
      const list = (text: string | undefined) => (text ?? "").split(",").map((s) => s.trim()).filter((s) => s !== "");
      const [issuer, repository, refs, workflows] = [process.env["ARCHITECT_OIDC_ISSUER"], process.env["ARCHITECT_OIDC_REPOSITORY"], list(process.env["ARCHITECT_OIDC_REF"]), list(process.env["ARCHITECT_OIDC_WORKFLOW"])];
      const policy = issuer && repository && refs.length > 0 && workflows.length > 0 ? { policy: { issuer, repository, refs, workflows } } : {};
      const said =
        verb === "up"
          ? Environments.up({ ...name, ...policy, ...(Option.isSome(port) ? { port: port.value } : {}), ...(Option.isSome(revision) ? { revision: revision.value } : {}) }).pipe(Effect.map((s) => [`${env} up ${s.url}`]))
          : verb === "down"
            ? Environments.down(name).pipe(Effect.map(() => [`${env} down`]))
            : Environments.status(name).pipe(
                Effect.flatMap((s) =>
                  s.state === "up"
                    ? TestWorlds.live(s.url).pipe(Effect.map((worlds) => [`${env} up ${s.url}`, ...(worlds === undefined ? [] : [`worlds ${worlds}`])]))
                    : Effect.succeed([`${env} down`]),
                ),
              );
      return said.pipe(Effect.flatMap((lines) => Console.log(lines.join("\n"))), Effect.catchTag("EnvironmentFailed", (e) => fail(e.message, 2)));
    },
  );
const env = Command.make("env").pipe(Command.withSubcommands([environment("up"), environment("down"), environment("status")]));

// `architect worlds reap`: destroys every world of the test environment that is past its lifetime (D3 #7, #50).
const reap = Command.make(
  "reap",
  { root: Flag.String("root").pipe(Flag.withDefault(process.cwd())) },
  ({ root }) =>
    TestWorlds.reap({ root, name: "test" }).pipe(
      Effect.flatMap((n) => Console.log(`reaped ${n}`)),
      Effect.catchTag("TestWorldFailed", (e) => fail(e.message, 2)),
    ),
);
const worlds = Command.make("worlds").pipe(Command.withSubcommands([reap]));

Command.make("architect").pipe(
  Command.withSubcommands([model, dev, prove, add, check, generate, brief, impact, version, build, env, worlds]),
  Command.run({ version: "0.0.0" }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
