# Package structure

The map and why it is shaped this way: [`decisions/M0-packages.md`](decisions/M0-packages.md). The layer 1 and 2
version of this page is in [`history/packages-layers-1-2.md`](history/packages-layers-1-2.md).

## The framework's repository

```text
packages/
  forman/            @formants/forman            the front door: the Blueprint API (Blueprint.thing, machine, event,
                                                 error, role, operation, read, journey, world, environment, value,
                                                 todo). What projects and their generated code import. Effect only.
  compiler/          @formants/compiler          reads blueprint/ by path and builds the model: every declaration, its
                                                 hash, what it uses; compares two models (versions, stale proofs);
                                                 finds blanks. Bin forman-model
  generators/        @formants/generators        the Nx plugin: scaffold generators write once; sync generators render
                                                 each output and fail `nx sync:check` on drift
  language-effect/   @formants/language-effect   the Effect language: renders api, server, sdk, cli, mcp, docs; and the
                                                 runtime generated code runs on (handler wrapper, role checks, moves and
                                                 events, locks, outbox, idempotency, steps as spans, Clock, Timers)
  language-solidity/ @formants/language-solidity the Solidity language (a placeholder until M6)
  host-cloudflare/   @formants/host-cloudflare   where it runs: Workers, Durable Objects, alarms, D1, R2, and auth on
                                                 Better Auth until M2 moves it into @formants/auth
  prove/             @formants/prove             worlds (made and destroyed), journeys, evidence from telemetry, the
                                                 evals, verdicts, promote, publish, releases
  lint/              @formants/lint              oxlint rules for what types can't see, and against the old names
  cli/               @formants/cli               the `forman` command: add, generate, check, prove, impact, promote,
                                                 publish, watch
  preset/            @formants/preset            the Nx preset that makes a starter project (until `forman new`, M2.09)
  portal/            @formants/portal            the portal every project gets
  logbook/           @formants/logbook           verdicts and the model, kept per project
examples/
  acme/              the worked example: the allowance
  work/              the work app (F5)
  starter/           what the preset copies into a new project
e2e/                 the gates: e2e:layer1, e2e:layer2, e2e:m0
```

Plugins come later, one package each: `@formants/auth` and `@formants/organizations` (M2), `@formants/work` (M3),
`@formants/agents` (M4), `@formants/stripe` and `@formants/resend` (M5), `@formants/wallets` (M6). Nothing is
published to npm before M7; every milestone before it publishes to the local Verdaccio.

## Rules, held by Nx module boundaries

- `forman` (tag `scope:forman`) depends on nothing but Effect. Every other package may import it.
- A project (`scope:project`) depends only on `scope:forman`, `scope:language` and `scope:host`.
- `env:runtime` packages depend only on `env:runtime` packages; `env:build` packages may use both.
- `language-effect`'s runtime is the only package generated code imports at run time, besides `forman`, the host and
  the project's own code.
- `compiler` and `generators` never run in production.
- A language is a package of its own (`language-effect`, `language-solidity`, later `language-noir` and
  `language-python`); a host is where it runs (`host-cloudflare`).

## A project made with it

```text
acme/
  forman.config.ts          the project's name, sign-in and telemetry choices, until mounts take them (M1, M2)
  blueprint/
    values/                 named types, each saying what it is in every language
    things/<thing>/         thing.ts, machine.ts, events.ts, errors.ts, roles.ts, verbs/<verb>.ts
    journeys/<journey>.ts
    starting-worlds/<name>.ts
    environments/<name>.ts  clock, secrets, destinations
  src/
    <thing>/<verb>.ts       a thing's handlers, mirroring blueprint/things/<thing>/
  generated/
    server/  api/  sdk/  cli/  docs/  model/  mcp/  portal/
```

From M1, `blueprint/` also holds the mounts: `features/`, `adapters/` and `projections/`, one file each
([`frame/mounting.md`](frame/mounting.md)).
