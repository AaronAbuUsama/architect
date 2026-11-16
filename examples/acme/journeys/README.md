# Journeys and planted fixtures (stage 1)

Written by the journey author, not the builder. The builder never edits these files, the evals or the runner's generic checks.

## Files

- `journeys/grant-an-allowance.ts`: the one journey. Cast: ada (`owner`), olga and bob (`Blueprint.signedIn`).
- `blueprint/starting-worlds/founded.ts`: ada runs `organization.create({ name: "Acme Demo", cap: 1000n })`; it gives `organization`.
- `test/fixtures/evals/<eval>/`: one planted break per eval, each with its own README (what it replaces, what it breaks, the failure shape).

## The journey

| # | Call | Expected |
|---|---|---|
| 1 | ada `allowance.grant` olga, 500 | answers an `alw_` id; `AllowanceGranted { allowance, limit: 500n }`; allowance in `active`; spans `allowance.grant` and `allowance.grant.insert` |
| 2 | bob `allowance.grant` (own id, 500) | refused `NotAllowed`; no events; spans `allowance.grant` and `.insert` both absent (handler never ran) |
| 3 | ada `allowance.grant` olga, 1001 | refused `AllowanceLimitTooHigh { cap: 1000n }` (exit 44); no events; span `allowance.grant` present, `.insert` absent |

Coverage this gives: grant move 1/1, outcome `active` 1/1, refusals `AllowanceLimitTooHigh` and `NotAllowed`.

## Fixtures

| Eval | Fixture | Break |
|---|---|---|
| 1 answer shape | `answer-shape/grant.ts` | answers a number for the id |
| 2 declared errors | `declared-errors/grant.ts` | fails with undeclared `AllowanceMemberUnknown` |
| 3 machine path | `machine-path/grant.ts` | moves to undeclared `paused` |
| 4 events | `events/grant.ts` | row written with no move, no `AllowanceGranted` |
| 5 who may call | `who-may-call/main.ts` | server runs the handler with no role gate |
| 6 steps | `steps/grant.ts` | declared `insert` step never run |
| 7 performance | `performance/README.md` | none; review only, never fails |
| 8 coverage | `coverage/rename*.ts` | new operation `organization.rename` no journey calls |
| 9 explainability | `explainability/grant.ts` | refusal with no deciding log |

## Expected on the scaffolded handlers

Every handler returns `Handlers.blank(...)`, which dies with `BlankReached`. So `organization.create` dies inside the starting
world and `founded` cannot be made: the journey fails before step 1 (`starting world founded: organization.create died: BlankReached`),
and no step runs. `prove` exits 1. Evals report no passing evidence for grant (answer shape and the others fail or have none).
Step 2 would still refuse bob once the gate exists, but never runs while the world fails.

## Formats I chose where the docs were silent

- **Location.** The task put the journey in `examples/acme/journeys/`; the docs say `blueprint/journeys/`. The starting world is at the docs' path, `blueprint/starting-worlds/founded.ts`. The builder may move the journey to where `Layout.journeys` reads, or read both.
- **Calls.** The docs write `s.ada.invitation.send(...)`, which needs the generated SDK on the cast. I wrote `s.ada.run(operation, payload)`, naming the declaration by import (no name strings, per AGENTS.md).
- **Cast role.** acme has only `owner`; D2's "olga member" has no role yet. Olga and bob are `Blueprint.signedIn`; bob is an outsider because he isn't the organization's owner.
- **Person ids.** `s.<name>.person` is each cast member's world-issued person id (D2: tokens carry `person`).
- **Assertions.** Docs give `expect(...).toBe`, `refuses(Error, fields)`. New, mine: `emits(Event, fields)`, `noEvents()`, `machine.isIn(id, state)`, `spans({ present, absent })`, `expect(...).toMatch(regex)`. `s.last` is the previous step's answer and `s.world` the starting world's gives, as in the docs.
- **Starting-world calls.** `s.ada.run(create, payload)`, same form as in a journey; `starts: "founded"` names the world by its string, as the docs do.
- **Journey name.** `Blueprint.journey("grant an allowance", ...)`, the docs' first form with the kebab-case file name `grant-an-allowance.ts`.
- **Fixture install.** Each fixture file is written for its installed location (imports relative to the file it replaces), and a runner copies it over the target in a scratch copy of acme. Fixtures are outside the Nx graph (`.nxignore`, D2 #12) and not type-checked in place.
- **Handler context.** Machine-path uses `move` from the handler context (docs handlers do); the current `HandlerContext` lacks it. Declared-step results: `steps.insert(effect)` returns the effect's value.
- **Log eval placement.** The docs list "each refusal has the log that decided it" under steps (eval 6); the task assigns it to explainability, so `explainability/` plants it and `steps/` plants a missing span. Builder may keep the check in either eval as long as each fixture fails its named one.
- **Who may call.** The break cannot be a handler; the gate runs first. The fixture replaces `generated/server/main.ts` (grant route only) and must be regenerated to match what the generator then emits, with just the gate removed.
- **Fixture check.** A fixture passes when the named eval is among the failing evals; other evals may fail too.
