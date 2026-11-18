# O3: every call leaves the operation's span, with its caller and its move

Decided 18 November 2026 by the building agent, under "Who decides" in `AGENTS.md`. Extends O1 and O2 and amends D2 #20.
Held with M1 until K5 (PR #44) is agreed. It lands beside O2's slices M1.18 to M1.20, which are lined up with it below.

## Why

The generated app (spike `spikes/generated-app`, PR #41, its README found 9) draws each operation as one shape: the role
check, the steps, the refusals, the move and the event, lit by live telemetry. Aaron's goal is that every call lights its
shape, which needs every trace to carry the model's names. Two kinds of call did not, both seen live on acme:

1. **A refused caller left no operation span.** `Access.check` ran before `spanned(name, …)` opened the operation's span
   (`packages/language-effect/src/modules/handler/service.ts:46` and `:83`, and `internal/read.ts:52`). spend called
   by ada (the organisation's owner, not the grantee) left a two-span trace, HTTP `POST` and `sqlite`, with no
   `operation`, no `principal.*` and no `refusal`. Nothing named the call, its caller or why it was refused.
2. **The move was written on whichever span was current.** `chooseOutcome` (`internal/move.ts:48`) used
   `annotateCurrentSpan`. acme's revoke calls `move("revoked")` inside `steps.update(...)`, so `move.name` landed on
   `allowance.revoke.update` and the operation span had `event.name` but no `move.name`. O1's own table (line 206)
   already says `move.name` and `move.to` go on the operation span, so the code had drifted from the design.

## The decision

- **The operation's span opens first.** Every call that decodes leaves `<operation>` with `operation` and
  `principal.*`. The role check is its first child span, `<operation>.access`, tagged `step.kind: "access"`. A
  `NotAllowed` refusal is written on the operation's span as `refusal`, as every refusal is, and the span ends ok (O1).
  Reads do the same.
- **A refused caller's span names who and why, never what they sent.** The payload is written only once the role
  check passes, so no `payload.*` of a refused call reaches a span, free text or not. O2 gap 2 (M1.19) then decides
  which fields of an allowed call are traced; nothing here traces text before it.
- **D2 #20 keeps its meaning.** A refused caller still runs no handler work: no step span, no handler, no commit.
- **`access` is a reserved step name.** The runtime names its own span `<operation>.access`, so a step declared
  `access` would make two spans of one name. The compiler refuses it
  (`packages/compiler/src/modules/model/internal/layout.ts`, `RESERVED_STEPS`). M1.18 adds `commit` to the same list
  for `<operation>.commit`.
- **The move is written on the operation's span** whichever span `move` is called from. The wrapper takes the
  operation's span once, when it opens, and gives it to `chooseOutcome`. An outcome the move doesn't declare is still
  written there (`move.to`) before the handler dies, so the evidence survives.

## What other authors own (not in this change)

`AGENTS.md`: a builder never edits journeys, the evals or the runner's generic checks. O3 changes what a refused call
leaves, so these must change, by their own authors, before O3 lands. PR #48 lists each one with its exact edit:

- **Journeys** (acme and starter): every step refused `NotAllowed` that asserts `spans({ absent: ["<operation>"] })`
  becomes `present: ["<operation>", "<operation>.access"]` and keeps each declared step absent.
- **The "leaks nothing" eval** (`packages/prove/src/modules/evals/internal/secrets.ts`): by value it now matches a
  private payload field that holds the caller's own id against `principal.person` on the refused call's span (acme's
  `prove/secrets.test.ts`, bob granting bob with a private `member`). The check author decides between exempting
  `principal.person` when it is the caller's own id, or another answer.
- **`prove/secrets.test.ts:129`** expects `payload.organization` on every `allowance.grant` span. A refused grant's
  span now has no payload, so it should judge the allowed calls only.
- **Reading the move** (`evals/internal/evidence.ts` `attr`): proposed to read the operation's span only, not the
  subtree, so a misplaced move fails "machine path" instead of being found under a step.

## Lined up with O2

- **Gap 2 (M1.19), free text.** Unchanged and still needed: it governs an allowed call's payload. O3 adds that a refused
  call has no payload attributes at all, so M1.19's check, `payload.memo` absent from `spend`'s span, already holds for
  refused calls.
- **Gap 3 (M1.20), every call counted.** Its premise was that a stranger leaves no span. After O3 a stranger leaves the
  operation's span and `.access`; only a bad payload leaves none. M1.20's proof becomes: a bad payload and a stranger
  are two refusals in `forman.calls`, the bad payload with no span and the stranger with only `<operation>` and
  `<operation>.access`. The metric is still needed: it counts a bad payload, and counts without reading traces. The
  `refusal` tag on the metric and on the span must be one name, taken from the same place, so the two can't disagree.
- **Gap 1 (M1.18), the commit span.** `<operation>.commit` follows `<operation>.access`'s pattern (`step.kind`, a
  reserved step name).

## Evidence

- `handler.test.ts`: a caller the role refuses leaves `allowance.revoke` with `principal.person`, `refusal: NotAllowed`,
  no `payload.*`, ended ok, with `allowance.revoke.access` under it and no step span; a move made inside a step writes
  `move.name`, `move.to` and `event.name` on the operation's span and none on the step.
- `records/reads-and-requests.test.ts`: a refused read leaves `purse.get` with the caller, the refusal and
  `purse.get.access`.
- `compiler` `model.test.ts`: a step named `access` is refused, naming the file.
- A local `forman dev` run of acme (`design/evidence/O3/live-traces.json`, from the Collector's `traces.jsonl`): spend
  by ada (owner, not grantee), trace `e9c9c55c…`, is `allowance.spend` with `principal.person` and
  `refusal: NotAllowed` and no `payload.*` (no `memo`), with `allowance.spend.access` under it; revoke, trace
  `b9f1c2c8…`, has `move.name: revoke`, `move.to: revoked` and `event.name: AllowanceRevoked` on `allowance.revoke`,
  none on `allowance.revoke.update`; `allowance.get` by bob, trace `18e2ce2d…`, is refused the same way as spend.
