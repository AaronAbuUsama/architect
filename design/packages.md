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
    agent/           @architect/agent       the agent harness: Pi Durable behind an Effect seam, models, tools derived
                                            from the blueprint, skills, sandbox, run records, benchmarks (H1, H2) (layer 2 track)
  benchmarks/        (private, never published) the internal benchmarks: `main.ts` entry, suites, committed baselines (H2)
  examples/
    acme/            the worked example, built layer by layer; CI proves it on every change to Architect
  docs/              these docs
```

Layer one needs eight of them: blueprint, compiler, generators, target-effect, host-cloudflare, prove, lint and cli
(with the preset).
The rest arrive with their layer.

Rules, held by Nx module boundaries:

- `blueprint` depends on nothing but Effect. Every other package may import it.
- Generated code imports `target-effect`'s runtime, `blueprint`, the host and project code. D4 additionally permits
  the declaration-only entry and matching target/host runtime entry explicitly declared by a selected kit.
  Generated API/SDK/browser code may import only its declaration entry; a Worker may not import the Node entry.
  Verify the import closure. This does not permit compiler/generator imports or direct project imports of the
  kit's wrapped libraries.
- `agent` is `env:build` (dev and CI tooling, never in production in v0). It may depend on `blueprint`, `compiler`,
  `prove` and the `target-effect` interfaces (`Timers`, `Clock`), and `cli` depends on it. Pi Durable and its closure
  (`pi-ai`, `chord`, `pi-codemode`, `pi-schema`, `pi-telemetry`, all pinned at 1.5.0) are imported only inside
  `packages/agent`, only through its `internal/` seam; no generated code and no other package imports Pi. Its Durable
  Object host (`@architect/agent/do`, build-plan step A6) is the one runtime-facing file, tagged separately then.
  Six slots per module: `harness` (the `Runner` kinds `sdk`, `pi`, `oracle`, `null`; the Agent SDK and Pi each only in its
  `internal/`), `models`, `tools`, `skills`, `sandbox`, `telemetry`, `runs`, `tasks`, `score`, `suite`, `report` (H2 section 3).
- `benchmarks` is an `env:build` Nx project, not a package: it depends on `agent` and nothing depends on it. Its `main.ts` is the
  only file that reads a model key from the environment, by name. Run folders go to `benchmarks/.architect/` (ignored); only
  `benchmarks/baselines/*.json` summaries are committed.
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
  src/
    <thing>/<verb>.ts       a thing's handlers, mirroring blueprint/things/<thing>/
    <thing>/<Thing>.sol     its contract, and its workflows                       (layers 4, 5)
    services.ts
  generated/
    server/  api/  sdk/  cli/  docs/  model/                                      (layer 1)
    mcp/  portal/  infra/                                                         (layer 2)
    contracts/                                                                    (layer 4)
    keeper/                                                                       (layer 5)
  spikes/
```
