# Package structure

## The framework's repository

```text
architect/
  packages/
    blueprint/       @architect/blueprint   the declaration language: Blueprint.thing, machine, event, error, role,
                                            operation, read, journey, world, environment, value, todo. What projects import.
    compiler/        @architect/compiler    reads blueprint/ by path and builds the model: every declaration, its hash,
                                            its dependencies; compares two models (versions, stale proofs); finds blanks
    generators/      @architect/generators  the target-neutral Nx plugin. Scaffold generators (add thing, operation, read,
                                            journey, kit) write once; sync generators run each target and fail
                                            `nx sync:check` on drift
    target-effect/   @architect/target-effect  the Effect target: generates api, server, sdk, cli, mcp, docs; and the runtime
                                            generated code runs on (handler wrapper, role checks, moves and events, locks,
                                            outbox, idempotency, steps as spans, Clock, Timers, counted work; client side)
    host-cloudflare/ @architect/host-cloudflare  where it runs: Workers, Durable Objects (world, organisations, things,
                                            followers, relayer), alarms, D1, R2, Containers for benches, Miniflare locally
    prove/           @architect/prove       worlds (made and destroyed), journeys, evidence from telemetry, the evals,
                                            verdicts
    lint/            @architect/lint        oxlint rules for what types can't see: a name as a string, an edited output,
                                            a blank left, a handler at the wrong path
    cli/             @architect/cli         the `architect` command: new, add, generate, check, prove, promote, watch
    preset/          @architect/preset      the create-nx-workspace preset: the starter project
    std/             @architect/std         the standard library's kits: auth, wallets, chain, later erc20, safe   (layer 3)
    target-solidity/ @architect/target-solidity  the Solidity target: types, compiled machine, signatures, calendar,
                                            Foundry tests, contract scaffolds                                       (layer 4)
    portal/          @architect/portal      the portal app every project gets                                     (layer 2)
    logbook/         @architect/logbook     verdicts and the model, kept per project                              (layer 2)
  examples/
    acme/            the worked example, built layer by layer; CI proves it on every change to Architect
  docs/              these docs
```

Layer one needs eight of them: blueprint, compiler, generators, target-effect, host-cloudflare, prove, lint and cli
(with the preset).
The rest arrive with their layer.

Rules, held by Nx module boundaries:

- `blueprint` depends on nothing but Effect. Every other package may import it.
- `target-effect`'s runtime is the only package generated code imports at run time, besides `blueprint`, the host and
  the project's own code.
- Targets are languages (target-effect, target-solidity, later target-python); hosts are where it runs (host-cloudflare).
- `compiler` and `generators` never run in production.
- A target is a package of its own, so adding Python later is adding `target-python`.

## A project made with it

```text
acme/
  architect.config.ts
  blueprint/
    values/                 named types, each saying what it is in every target
    things/<thing>/         thing.ts, machine.ts, events.ts, errors.ts, roles.ts, verbs/<verb>.ts
    kits/                   which standard-library kits it uses, and how          (layer 3)
    journeys/<journey>.ts
    starting-worlds/<name>.ts
    environments/<name>.ts  clock, chain, secrets, destinations
  implementation/
    handlers/<thing>/<verb>.ts
    services.ts
    contracts/              your Solidity                                         (layer 4)
  generated/
    server/  api/  sdk/  cli/  docs/  model/                                      (layer 1)
    mcp/  portal/  infra/                                                         (layer 2)
    contracts/                                                                    (layer 4)
    keeper/                                                                       (layer 5)
  spikes/
```
