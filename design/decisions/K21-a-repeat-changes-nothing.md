# K21: a repeated call answers instead of refusing

**Status: proposed, waiting on Aaron's grill (20 November 2026).** Drafted by the 📐 Capxul language designer thread.
It answers two of Capxul's questions at once, "a move that changes nothing" and "idempotent by intent", because they
are one family: a call that asks for what is already true should answer, change nothing and emit nothing, rather than
be refused. They differ only in how "already true" is recognised: by the subject's state, or by what the payload means.
Grounded at `origin/goal/stage-1` `f109821d` and Capxul Next `50851875` (read only).

## The problem, in code

**A move from the state it would end in is refused.** The machine's check runs before the handler, and any state
outside `from` is refused with the machine's one `notFrom` refusal:

```ts
// packages/language-effect/src/modules/handler/internal/move.ts:31-38
export const checkFrom = (op: Operation, refusal: string | undefined, subject: Instance | undefined) =>
  Effect.gen(function* () {
    const move = op.move;
    if (!move || move.from.length === 0 || refusal === undefined || subject === undefined) return undefined;
    const state = subject.state ?? "none";
    if (!move.from.includes(state)) return yield* Effect.fail(new NotFrom({ _tag: refusal, state }));
    return state;
  });
```

So accepting an invitation twice is `InvitationNotPending` (`examples/starter/blueprint/things/invitation/machine.ts:9-12`).
Capxul answers the second accept instead:

```ts
// capxul-next packages/blueprint/src/things/invitation/lifecycle.ts:33-40
accept: {
  from: ["pending"], to: "accepted", by: invitationAccept, event: InvitationAccepted,
  otherwise: { accepted: "unchanged", declined: closed },
},
```

and its journey says "invitation.accept as olga of the invitation she accepted answers AlreadyAccepted with the same
invitation and member, and the world's history gains no entry" (`invitation/verbs/accept.ts:125-127`). Adding `accepted`
to `from` doesn't help: the runtime would apply the move again, write `InvitationAccepted` a second time and journal it
(`move.ts:62-84`).

**A repeat is only recognised by a request key.** `idempotent` takes one value:

```ts
// packages/orthograph/src/modules/operations/types.ts:56
readonly idempotent?: "request";
```

and the runtime replays only when the caller sends the same key (`handler/service.ts:59-67`, `IdempotencyConflict` when
the key comes back with another payload). Capxul's founding has no key: the same founding sent again answers `Resumed`,
a changed one is refused `FoundingChanged`, and another founder's is `HandleTaken`:

```ts
// capxul-next packages/blueprint/src/things/company/verbs/create.ts:40-47, :152-155
export class Resumed extends Schema.TaggedClass<Resumed, ...>()("Resumed", { org: OrgId, handle: OrgHandle, ... }) {}
claim("The same intent resumes the same Organization; a changed intent or another founder refuses.", w.fresh,
  "The same org.create twice answers Founded, then Resumed with the same org id and no event. The same handle with another
   name is refused with FoundingChanged; the same handle founded by eli is refused with HandleTaken.", ...)
```

`approval.sign` does the same with the signature as the intent: the same signature again answers `AlreadySent`
(`approval/verbs/sign.ts:22-36`, `:128-130`).

**Why it matters now.** Retries are the normal case for calls that come from outside. M3.08's done-when is already "a
posted verdict closes its item once, even when posted twice". A payment settled by a chain event may also be settled by
the processor's webhook, or by hand: a different call, the same truth. The frame promises inbound events are
"idempotent by event id" (`design/frame/adapters.md`, kind 32 of the language spec), which covers the same event
delivered twice, and nothing else. Today the second settle is a refusal, and a refusal from a webhook is retried, or
alarms someone, forever.

## What it touches

| Dependent | Why it cares |
|---|---|
| `orthograph` `machines/types.ts` (`MoveSpec`), `operations/types.ts:56` | a move gains the states it answers from unchanged; `idempotent` gains a key made from the payload |
| `language-effect` `handler/internal/move.ts`, `handler/service.ts:59-96` | the from-check lets an unchanged state through, the commit refuses any write, the request store is keyed by intent |
| `compiler` model (`describe.ts:99`, `:168-184`), `exits.ts`, `codes.ts` | the move's unchanged states and the operation's intent key in the model; which refusals a call can still give |
| `prove` and the evals | a journey can assert "answered, nothing journalled"; coverage asks for each unchanged state once |
| generators: docs, MCP `idempotentHint` (M1.37), SDK retry advice | each says which repeats are safe |
| grid cells `machine.model`, `machine.docs`, `machine.portal`, `machine.telemetry`, `operation.mcp` | the machine diagram shows the unchanged loop; the trace marks an unchanged call |
| M3.08 (inbound events), M5.03 (`on:` in general), M2.07 (organisations' invitations), stage 2 payments | each takes repeats from outside |

## The options

**Today**, both repeats are refusals: `InvitationNotPending` for the second accept, and for a second founding without a
key, `HandleTaken` from the unique rule (G4), the same answer a stranger gets.

**A · Both: `unchanged` on a move, and `idempotent: { by }` on an operation** (recommended)

```ts
// blueprint/things/invitation/machine.ts
export const machine = Blueprint.machine(Invitation, {
  states: ["pending", "accepted", "declined"],
  moves: {
    send:    { from: [], to: "pending", emits: Events.InvitationSent },
    accept:  { from: ["pending"], to: "accepted", emits: Events.InvitationAccepted, unchanged: ["accepted"] },
    decline: { from: ["pending"], to: "declined", emits: Events.InvitationDeclined },
  },
  notFrom: { exit: 40 },
});
// accept from "accepted": the handler runs and answers as usual, sees subject.state === "accepted", and must not move
// or write. No event, no journal entry; the span says move.unchanged = true. A write or a move is the handler's bug: it dies.
// accept from "declined": InvitationNotPending, as today.

// blueprint/things/company/verbs/create.ts
export default Blueprint.operation(Company, {
  payload: { handle: Company.fields.handle, name: Company.fields.name, country: Company.fields.country },
  answer: { company: Company.fields.id },
  move: machine.moves.found,
  errors: [CompanyHandleTaken],
  allowed: [Blueprint.signedIn],
  idempotent: { by: ["handle"] },   // the request key is the caller and the handle, made by the runtime; no header
});
// Dana founds northwind twice with the same payload: the second answers the first's answer, nothing changes.
// Dana sends northwind with another name: IdempotencyConflict (exit 120), as a reused request key is today.
// Eli sends northwind: no kept answer for Eli and that handle, so the call runs and the unique rule refuses CompanyHandleTaken.

// payment settle, from a webhook or a chain event
settle: { from: ["pending"], to: "settled", emits: Events.PaymentSettled, unchanged: ["settled"] },
```

**B · Only `idempotent: { by }`**

```ts
idempotent: { by: ["invitation"] },   // on accept: the same caller and invitation replays the first accept's answer
```

**C · Only `unchanged` on the move**

```ts
accept: { from: ["pending"], to: "accepted", emits: Events.InvitationAccepted, unchanged: ["accepted"] },
// a second founding has no subject yet, so it still meets the unique rule: HandleTaken for Dana as for Eli
```

**D · Capxul's own form: an answer per wrong state, the handler decides the rest**

```ts
accept: {
  from: ["pending"], to: "accepted", emits: Events.InvitationAccepted,
  otherwise: { accepted: "unchanged", declined: InvitationClosed },  // a refusal per state, replacing the one notFrom
},
// founding: no framework support; the handler finds the company by handle, compares, and answers Resumed or refuses
```

### You do X → what happens

| Scenario | A · both | B · intent key only | C · `unchanged` only | D · Capxul's form |
|---|---|---|---|---|
| Olga accepts her invitation twice (a double click) | the same answer; no second event | the first answer replayed | answered unchanged | answered unchanged |
| A webhook settles a payment that a chain event already settled | answered unchanged; the webhook stops retrying | refused `PaymentNotPending`: a different call, no kept answer | answered unchanged | answered unchanged |
| Dana's founding is sent again after a timeout, no key | the first answer, the same company | the first answer | `HandleTaken`, as if she were a stranger | whatever her handler does |
| Dana sends the same handle with a new name | `IdempotencyConflict` | `IdempotencyConflict` | `HandleTaken` | the handler's `FoundingChanged` |
| A handler writes something in an unchanged call | it dies loudly; nothing commits | n/a | it dies loudly | nothing stops it |
| The docs, MCP and the machine diagram say which repeats are safe | yes, both kinds | the key only | the state only | only what the handler says in prose |

### Rubric

| Axis | A · both | B · intent key only | C · `unchanged` only | D · Capxul's form |
|---|---|---|---|---|
| Floor-first | ✅ the key reuses the request store and its conflict check: today's key is `${name}\|${who}\|${request}` (`service.ts:152-155`), and A swaps `request` for the canonical `by` fields; `unchanged` is one more branch in `checkFrom` | ✅ smallest | ✅ small | ⚠️ a per-state refusal map replaces `notFrom` everywhere |
| Reversibility | ✅ both additive and optional | ✅ | ✅ | ❌ changes every machine's refusals |
| Blast radius | ⚠️ orthograph, language-effect, compiler model, prove, docs and MCP | ⚠️ fewer | ⚠️ fewer | ❌ refusal codes, exits and every generated `Not<State>` |
| Correctness | ✅ each repeat recognised the way it really repeats; the runtime enforces "nothing changed" | ❌ the cross-path repeat, settle's real case, stays a refusal | ❌ a resent founding looks like a stranger's | ⚠️ "nothing changed" rests on each handler |
| Fit | ✅ `idempotent` already exists; `unchanged` sits on the move it describes | ✅ | ✅ | ⚠️ Capxul's machine, not Orthograph's |

**Recommendation: A.** The two halves catch different repeats: a key catches the same call sent twice, a state catches
the same truth reached another way. Settle needs the second, founding needs the first, and both are small.

### Smaller calls inside A, decided here unless Aaron objects

1. **The replay answers the first answer, not the current state.** Capxul's `Resumed` re-reads the company as it
   stands; A replays what the first call answered, as `"request"` does today. A caller that wants the current state reads
   it. Distinct answer tags like `AlreadyAccepted` are not added: a retrier needs the same answer, not a new one.
2. **The key always includes the caller.** Another person's identical payload is not a repeat; it meets the rules a
   stranger meets (`HandleTaken`).
3. **`by` names payload keys**, typed against the payload like a list's `where` (`operations/types.ts:161-167`). An
   empty `by` is refused by the compiler. `"request"` stays, and the two can't be combined on one operation.
4. **A changed intent is `IdempotencyConflict`,** the runtime's refusal at exit 120 (G3). Capxul's `FoundingChanged`
   becomes that. A declared refusal for it can come later if a journey needs to tell the two apart.
5. **An unchanged call still checks who may call** and still reads the subject; only the move, the writes and the event
   are skipped. Its span carries `move.unchanged: true` and `move.from` as the state it was in.
6. **Actors.** Idempotency by request on an actor is already in `design/later.md:42`; the intent key waits with it.

## Supersedes

Filled in once Aaron answers.

## Aaron's answers

Waiting on the grill.
