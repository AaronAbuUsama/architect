# 2. The blueprint

Part of [the story](story.md). Deeper: [`frame/story.md`](../../frame/story.md), section 2, and
[`mounting.md`](../../frame/mounting.md) for where files live.

The facts become declarations. Each is a file, and the name comes from the path. A project imports the API from the
front door, `@formants/forman`.

```ts
// blueprint/things/allowance/thing.ts
import { Blueprint } from "@formants/forman";

export const Allowance = Blueprint.thing({
  description: "Money a member may spend from their organisation, up to a limit each month.",
  fields: { id: Blueprint.id("alw"), organization: Organization.fields.id, member: Person.fields.id, limit: Amount, spent: Amount },
});
```

```ts
// blueprint/things/allowance/machine.ts
export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"],
  moves: {
    grant:  { from: [], to: "active", emits: Events.AllowanceGranted },
    spend:  { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent }, // two outcomes
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.AllowanceRevoked },
  },
  notFrom: { exit: 40 }, // generates AllowanceNotActive, carrying the state it was in
});
```

```ts
// blueprint/things/allowance/verbs/spend.ts
export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of this month's allowance.",
  payload: { allowance: Allowance.fields.id, amount: Amount, memo: Memo },
  answer: { remaining: Amount },
  move: machine.moves.spend,
  errors: [AllowanceExceeded],                       // carries { remaining }
  allowed: [grantee],                                // a rule: allowance.member is the caller
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",                             // retried with the same request key, it spends once
  budget: { p95: "150 millis" },
});
```

`grant` and `revoke` have the same shape, allowed to `owner.of("organization")`.

A thing also says where it lives. The allowance lives in the database (the default), because the owner will want to
list them. A thing that needs one writer at a time and no lists would say `lives: "actor"`: one Durable Object per
allowance.

This is the whole contract. Everything else in the story is made from these files, or judged against them.

## The folder

```text
blueprint/
  things/          your own things: the root feature
  features/        mounted features, one file each
  adapters/        mounted adapters, one file each
  projections/     mounted projections, one file each
  environments/    where each projection lives
  journeys/  starting-worlds/  values/
src/               how it behaves: the only hand-written logic
generated/         everything else; never edited
```

The `features/`, `adapters/` and `projections/` folders are the plugin mounts. See [plugins](plugins.md).

## Today and proposed

> **Today.** All of this compiles (`examples/acme/blueprint/things/allowance/`). Principals are only anonymous or a
> person, so "an agent spending for olga" cannot be said yet. There is no `features/`, `adapters/` or `projections/`
> folder.
>
> **Proposed.** `agent`, `service` and `system` principals (M2), and data **views** for lists over things that live as
> actors (M5). See [`delta.md`](../../frame/delta.md).

Next: [3. Journeys and blanks](story-journeys.md).
