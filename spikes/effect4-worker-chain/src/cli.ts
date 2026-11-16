import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect } from "effect"
import { Command, Flag } from "effect/cli"
import { ApiClient, grant } from "./client.ts"

const baseUrl = process.env.ACME_URL ?? "http://localhost:8787"

const grantCmd = Command.make(
  "grant",
  {
    to: Flag.String("to"),
    limit: Flag.Int("limit")
  },
  ({ to, limit }) =>
    grant(to, limit).pipe(
      Effect.tap(({ allowance }) => Console.log(allowance)),
      Effect.catchTag("AllowanceLimitTooHigh", (e) =>
        Console.error(`AllowanceLimitTooHigh: limit ${e.limit} exceeds max ${e.max}`).pipe(
          Effect.andThen(Effect.sync(() => { process.exitCode = 1 }))
        )),
      Effect.provide(ApiClient.layer(baseUrl))
    )
)

const allowance = Command.make("allowance").pipe(Command.withSubcommands([grantCmd]))

Command.make("acme").pipe(
  Command.withSubcommands([allowance]),
  Command.run({ version: "0.0.0" }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)
