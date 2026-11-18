# tickets: the canon's example

Free tickets for events, and nothing else: no money, no accounts, no organisations. Aaron picked it on 18 November
2026 in his first review of the canon, in place of a sign-up sheet ([`K8`](../../design/decisions/K8-canon-review-one.md)).
acme stays the fixture the tests and gates run on.

```text
blueprint/
  values/counts.ts              Count, Title, Holder
  things/event/                 an event with a fixed number of places
    thing.ts  events.ts  errors.ts  machine.ts
    verbs/open.ts  claim.ts  close.ts  get.ts
  things/ticket/                a ticket for some seats, held under a name
    thing.ts  events.ts  machine.ts
    verbs/check-in.ts  cancel.ts  get.ts
  environments/local.ts
  starting-worlds/
journeys/                       written first, by a different agent, failing on the blank handlers
src/event/  src/ticket/         the five handlers, the only code written by hand
generated/                      everything else, made from the blueprint
```

| Declaration | What it shows |
|---|---|
| `things/event/machine.ts` | states `onSale`, `soldOut`, `over`; `claim` has two outcomes, the last places sell it out |
| `things/event/verbs/claim.ts` | a payload, an answer, a refusal that depends on data (`SoldOut`), three steps, `idempotent: "request"`, and a second thing written in the same commit |
| `things/ticket/machine.ts` | a thing another operation creates: a ticket starts `issued`, and is checked in or cancelled once |
| `things/*/verbs/get.ts` | reads: no handler, no move |

A cancelled ticket's seats are not sold again: putting them back would move the event from `soldOut` to `onSale`
from the ticket's operation, and a move belongs to its own thing's operation.

```bash
node ../../packages/cli/src/main.ts check
node ../../packages/cli/src/main.ts prove --env local --port 8893
```
