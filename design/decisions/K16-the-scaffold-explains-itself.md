# K16: the scaffold explains itself

Decided 19 November 2026 by the ✍️ author for the conductor, from Aaron's call that day. After the blueprint →
generated → scaffolded walkthrough he asked for the scaffold to say, verbosely and visually, what it is and what it was
made from. His words: "what the machine could give you, yes, we need to do that… That's on the critical path. This is
what we need to do now", and "I agree with points four and five… I just want the DX to be better around it." Point 4:
the scaffold reads the machine. Point 5: a machine is finite, so every path through it, allowed and refused, gets a
journey stub.

## What changes for someone using Orthograph

When you open a new handler, the top of the file now tells you everything about it in plain lines: who may call it, what
comes in and goes out, every way it can be refused, the whole lifecycle of the thing with your call's rows marked, and
what Orthograph already does so you don't. The body is laid out for you: each step in order, each refusal with a blank
for each field it carries, one branch for each place the move can end, and a note where the answer has to supply
something the event needs. And one command, `ortho add journeys <thing>`, writes a journey stub for every path through
the thing's lifecycle, and `ortho check` tells you when the blueprint grows past a handler you already wrote.

## Where things stand today (`origin/m1` at `6419d4b7`)

- **The scaffold says almost nothing.** `renderHandlerScaffold` takes only the operation
  (`packages/projections/src/modules/handlers/internal/scaffold.ts:59`). Its doc comment is the description alone
  (`scaffold.ts:78`). Each step is a bare blank (`scaffold.ts:81`). Each refusal takes one blank for all its fields
  (`scaffold.ts:85`). The move is one blank for "the move's outcome" whatever the outcomes are (`scaffold.ts:64-66`),
  and the answer is one blank (`scaffold.ts:89`). It cannot say more: the thing's machine, errors, events and role
  rules are on `ThingModel` (`packages/compiler/src/modules/model/types.ts:36-55`), not on the operation.
- **The runtime already does a lot the handler never sees.** It checks who may call before the handler's span opens
  (`packages/language-effect/src/modules/handler/service.ts:60`). Then the machine's check
  (`service.ts:71`; `move.ts:30-40`, which skips a move with no `from`, `move.ts:33`). It runs the handler as counted
  work (`service.ts:74`). It checks the outcome the handler chose against the move's `to` (`move.ts:43-53`). It sets
  the state and builds the event from the instance as the call left it, then the payload, then the answer, the later
  winning (`move.ts:56-75`, the order at `move.ts:63-64`). It commits in its own span (`service.ts:88`) inside the
  operation's span (`service.ts:102`). The handler is told none of this beyond the `move` comment in its type
  (`packages/language-effect/src/modules/handler/types.ts:23-33`).
- **The words already exist, three times.** The docs page says who may call, each refusal with its exit code and
  meaning, and the machine as a table (`packages/generators/src/modules/render/internal/docs.ts:14-27`, `:66-68`).
  `ortho brief` says which refusals the runtime gives instead (`packages/cli/src/modules/brief/service.ts:32-34`).
  The scaffold says none of it.
- **`ortho check` lists only `Blueprint.todo` in `blueprint/`, never `Handlers.blank` in `src/`.** It reads
  `textsUnder(root, "blueprint")` (`packages/cli/src/modules/check/service.ts:21`) and matches `Blueprint.todo`
  (`packages/cli/src/modules/check/internal/blanks.ts:3`). A fresh scaffold's blanks are found only when `prove` reaches
  one (`BlankReached`, `types.ts:53`). That stays: a `Handlers.blank` is a hole in your code, which `prove` names
  with the step that reached it; a `Blueprint.todo` is a hole in the declaration, which `check` names.
- **Drift is half caught.** A new required step is already a warning, "required step steps.<key> is never called"
  (`packages/lint/src/modules/rules/internal/steps.ts:35`, wired as a warning at
  `packages/cli/src/modules/check/internal/tools.ts:49`). A new outcome or a new declared error is caught by nothing:
  check 19 shows `check ✔` with no warning for both.
- **The model carries files, not lines.** An operation has `file` (`types.ts:81`); a thing has none, but its files
  are fixed by the layout (`blueprint/things/<thing>/{thing,machine,errors,events,roles}.ts`) and found by
  `thingFileAt` (`packages/projections/src/modules/names/internal/names.ts:33`). No declaration has a line number.

## a. The header

Every handler scaffold's doc block, on the handler itself so an editor shows it on hover, says, in this order, each
part with the file it came from:

1. `<operation>: <description>` (the operation's `description`).
2. **Who may call**, from the roles file: the docs page's own phrase (`docs.ts:14`), then the role's rule as the
   model holds it (`roleRules`, `types.ts:52`). `anyone` and `signed-in` cite the verb file.
3. **Payload** and **Answer**, from the verb file: one line per field, `name  label`, where the label is
   `ref ?? named ?? value.type` with the visibility after it, as the docs page writes it (`docs.ts:12`). When a field
   gains a description (M1.42, K14's finding that `FieldModel` has none, `types.ts:18-26`), it follows the label. An
   empty payload is `Payload: none.`, an empty answer `Answer: nothing.`
4. **Refusals**, in `op.refusals` order (declared, then the machine's, then `NotAllowed`): name, `exit`, code, and who
   gives it. A declared one is "yours to refuse below", with its fields; the machine's is "the runtime's, when the
   <thing> isn't in <from>", carrying `state`; `NotAllowed` is "the runtime's, when the caller isn't <who>". Each
   cites its file (errors, machine, roles).
5. **Idempotent by request** and **Budget**, each only when the verb declares it.
6. **The thing's machine**, whenever the thing has one: a table of `from | move | to | emits`, one row per
   (from, to) pair in declared order, `(creates)` for a move with no `from`, and `▶` before this call's rows. When
   the operation makes no move, the caption says so and no row is marked.
7. **What the runtime does, so this handler doesn't**, each line present only when it applies: the role check
   (when anyone but `anyone` may call, `service.ts:40`); the machine's check (when the move has a `from`,
   `move.ts:33`); each step's span (`service.ts:48`); setting the state to the outcome given to `move`; writing the
   event, and from where each field comes (answer, else payload, else the instance as the call left it, as
   `move.ts:63-64` merges them); the operation's span and its commit's (`service.ts:88`, `:102`).

**The rule:** every word in the scaffold is a name or a description from the model, or one of the generator's fixed
phrases about Orthograph itself. Nothing names the domain unless the blueprint does: no "money left", no "the
member's balance". The header's sentences come from the same functions as the docs page and `ortho brief`, moved
into `@orthograph/projections` so the three can never disagree. Columns are padded to the longest entry plus two
spaces.

## b. The body

In this order, top to bottom:

1. **Each step, in declared order**: `// Step <key>: <kind>, span <span name>.` then `yield* steps.<key>(Handlers.blank("<key>: the work this step does"));`, with `// optional: may be skipped` when it is.
2. **Each declared error**, at the place section c gives: `// <Error>: exit <n>, <code>.`, the `if` on a blank,
   the `Effect.logInfo` that eval 9 wants, then `new <Error>({ ... })` with **one blank per field**, each saying the
   field and its label (`"AllowanceExceeded.remaining, an Amount"`). An error with no fields is `new <Error>({})`.
   The machine's refusal and `NotAllowed` get no block: the runtime gives them.
3. **The move**: `// The move <key>, from <from>: one branch per outcome.` With one outcome, one `yield* move();`. With
   more, an `if`/`else if`/`else` chain in declared `to` order, the last one the `else`, each condition a blank
   (`"does spend end in active?"`). Each branch opens with `// To <state>. From there the <thing> can: <move> (to
   <to>), ...`, listing every move whose `from` holds that state, or `nothing more` when none does.
4. **The answer**: an object with one blank per answer field. Above a field, a comment wherever the event needs it
   and only the answer can give it: an event field that is in neither the thing's fields nor the payload. For spend
   that is `remaining` (`AllowanceSpent` has `allowance, amount, memo, remaining`; the payload has the first three;
   the thing has none of them by those names). An empty answer is `return {};`.

An operation that calls an adapter (`calling`, `scaffold.ts:25-56`) keeps its call wiring and gains the same header.

**The signature** becomes `renderHandlerScaffold(op, path, model)`: the model is required, because the header needs
the thing. Its two callers pass it (`packages/generators/src/modules/render/service.ts:28`,
`packages/projections/src/modules/server/internal/server.ts:225`).

## c. Where refusals sit relative to steps

The model doesn't say which steps read and which write, except a database step that names `writes`
(`types.ts:67-68`). The rule: **the refusal blocks go before the first step that names `writes`; when none does,
before the last step; with no steps, before the move.**

| Option | allowance.spend (load, record) | allowance.grant (insert) | Fits the journeys? |
|---|---|---|---|
| **A · before the first writing step, else the last** (chosen) | after `load`, before `record` | before `insert` | ✅ `spend-within-allowance.ts:26` wants `record` absent and `load` present on a refusal; acme's grant journey wants `insert` absent |
| B · before every step | before `load` | before `insert` | ⚠️ spend can't know what's left before it loads |
| C · after every step | after `record` | after `insert` | ❌ the write's span runs on a refusal, which acme's journeys refuse |

Why: the last step is the likeliest write, because what decides a refusal has to be read first; and a refusal must
leave the write's span absent, which is what acme's journeys check. Nothing commits either way (the unit commits only
after an answer, `service.ts:86`), so this is about spans and readability, never correctness. It is a starting place
in a file that is yours; moving the block is a cut and paste.

## d. Source locations

The model carries no line numbers, and K16 adds none: **the header cites files only.** A scaffold is written once and
never regenerated, so a line number in it is wrong the first time the blueprint is edited; a file stays right,
because names come from paths and a declaration's path is its identity. Adding locations would touch the compiler's
loader for every declaration to serve one comment. If the portal later wants "jump to line", that is the model's own
slice, not this one.

| Axis | A · files only (chosen) | B · the model gains locations |
|---|---|---|
| Floor-first | ✅ ships with M1.44 | ⚠️ needs a compiler slice first |
| Reversibility | ✅ adding lines later is additive | ✅ |
| Blast radius | ✅ the scaffold alone | ❌ every declaration's loader and the model hash |
| Correctness | ✅ a file never goes stale | ❌ a line is stale after one edit |
| Fit | ✅ `op.file`, `thingFileAt` exist | ⚠️ nothing reads lines today |

## e. Journey stubs (point 5)

**The paths.** For each thing with a machine, for each move in declared order, for each operation that makes it (by
name): first every allowed path, one per `from` (or `(creates)`) and `to`, in declared order; then every refused path,
one per state not in the move's `from`, in declared state order, refused with the machine's `notFrom`. A move with no
`from` creates, and the runtime never checks it (`move.ts:33`), so it has no refused path. Declared errors and
`NotAllowed` are not machine paths; eval 8's coverage already asks for them. `machinePaths(model, thing)` returns
this list; allowance has eight: five allowed, three refused (golden list in `handlers.test.ts`).

**Where and how they're named.** `ortho add journeys <thing>` writes one scaffold per path to
`blueprint/journeys/<thing>-<verb>-<path>.ts`, where `<path>` is `<from>-to-<to>`, `created-in-<to>` or
`refused-from-<from>`. Flat, because the compiler reads a journey only at `blueprint/journeys/<file>.ts` or
`journeys/<file>.ts` (`packages/compiler/src/modules/model/internal/layout.ts:90`), and in `blueprint/`, because
that is where `ortho add journey` writes (`packages/cli/src/modules/add/internal/templates.ts:95`) and where
`check` looks for blanks. The title is `<operation>: <path in words>` (`"allowance.spend: refused from revoked"`).

**Each stub** opens `// Scaffolded from blueprint/things/<thing>/machine.ts. Yours from now on.`, says which path it is
in a doc block, and has the cast (the first `allowed` role), one step calling the operation, and its checks: an allowed
path `emits(<Event>, ...)` and `machine.isIn(..., "<to>")`; a refused one `refuses(machine.notFrom, { state })`,
`noEvents()` and `machine.isIn(..., "<from>")`. The starting world, the payload, the event's fields and the
instance's id are `Blueprint.todo`, each saying what belongs there. The goldens type-check in acme today.

**Why `ortho add`, not `ortho generate`.** Generate never writes into `blueprint/`; if it wrote stubs, every
project with a machine would fail `check` on its blanks the next time it generated, acme included (checks 00 and 10's
controls run `check` on acme), and a stub a person deleted on purpose would come back. `add` already writes
`Blueprint.todo` that `check` names (`packages/cli/src/modules/add/README.md`). Unlike `add`'s other kinds, which
write nothing if any file is there (`packages/cli/src/modules/add/service.ts:23`), `add journeys` writes the stubs
that are missing and names the ones already there, refusing only when every one is: after the machine grows, it
writes just the new paths.

**How they're counted.** A stub's `Blueprint.todo`s are blanks under `blueprint/`, so `ortho check` names each with
file and line and fails until it is filled, as it does for any blank (`check/service.ts:34`). The compiler must
accept a journey with blanks (it does today: a blank lands in the model as `{ kind: "blank" }`), list it under
`model.blanks`, and `prove` must skip it, naming it, rather than run it.

## f. Drift

When the blueprint gains a step, an outcome or an error after the handler is yours, **`ortho check` warns, naming the
handler's file**, in the rules part beside `required-step-used`:

- a required step never called: today's warning, unchanged;
- an outcome of the move that no `move("<outcome>")` in the handler names (only when the move has more than one; a
  `move(x)` with an argument that is not a literal is not judged, the way the step rule judges only named calls);
- a declared error the handler never names.

A warning, not a failure, as M1.26 decided for steps: the handler may be mid-edit, and `prove`'s evals 3, 4 and 2 fail
the call that actually goes wrong. Acme as shipped names every outcome and error, so check 10's "warns about nothing"
control holds. The header is yours and may go stale; the current explanation is always `generated/docs/<thing>/<verb>.md`,
which is regenerated every time.

| Axis | A · check warns (chosen) | B · check fails | C · regenerate the header |
|---|---|---|---|
| Floor-first | ✅ the rule plumbing exists (`tools.ts:33-35`, `:49`) | ✅ | ❌ needs a merge into your file |
| Reversibility | ✅ warn → error is one word | ⚠️ | ❌ |
| Blast radius | ✅ one lint rule and its facts | ❌ every handler mid-edit fails `check`; check 10 expects a missing step to warn and pass | ❌ rewrites a file that is yours |
| Correctness | ✅ prove still fails a wrong call | ✅ | ⚠️ |
| Fit | ✅ same as the step rule | ⚠️ unlike the step rule | ❌ "Yours from now on" |

## The worked example: `allowance.spend`

From acme's `blueprint/things/allowance/{machine,events,errors,roles}.ts` and `verbs/spend.ts`. This is the golden,
byte for byte (`e2e/fixtures/m1/scaffold-explains/allowance-spend.ts.golden`, on `claude/k16-checks`):

```ts
// Scaffolded from blueprint/things/allowance/verbs/spend.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/allowance/spend.handler.ts";

const { AllowanceExceeded } = Errors.declared;

/**
 * allowance.spend: Spend from what is left of this month's allowance.
 *
 * Who may call, from blueprint/things/allowance/roles.ts:
 *   the grantee of the allowance: (allowance, principal) => allowance.member === principal.person
 *
 * Payload, from blueprint/things/allowance/verbs/spend.ts:
 *   allowance  allowance.id
 *   amount     Amount
 *   memo       Memo
 *
 * Answer, from blueprint/things/allowance/verbs/spend.ts:
 *   remaining  Amount
 *
 * Refusals:
 *   AllowanceExceeded   exit 41  AL-001  yours to refuse below, carrying remaining; from blueprint/things/allowance/errors.ts
 *   AllowanceNotActive  exit 40  AL-900  the runtime's, when the allowance isn't in active, carrying state; from blueprint/things/allowance/machine.ts
 *   NotAllowed          exit 3   AR-001  the runtime's, when the caller isn't the grantee of the allowance; from blueprint/things/allowance/roles.ts
 *
 * Idempotent by request, from blueprint/things/allowance/verbs/spend.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/allowance/verbs/spend.ts: p95 150ms.
 *
 * The allowance's machine, from blueprint/things/allowance/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  grant   active     AllowanceGranted
 *   ▶ active     spend   active     AllowanceSpent
 *   ▶ active     spend   exhausted  AllowanceSpent
 *     active     revoke  revoked    AllowanceRevoked
 *     exhausted  revoke  revoked    AllowanceRevoked
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the grantee of the allowance;
 *   before it runs, it refuses AllowanceNotActive unless the allowance is in active;
 *   each step is its own span: allowance.spend.load, allowance.spend.record;
 *   once it answers, it sets the allowance's state to the outcome given to move;
 *   once it answers, it writes AllowanceSpent: allowance, amount and memo from the payload, remaining from the answer;
 *   the call is the span allowance.spend, and its commit allowance.spend.commit.
 */
const spend: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span allowance.spend.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AllowanceExceeded: exit 41, AL-001.
    if (yield* Handlers.blank<boolean>("refuse AllowanceExceeded when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AllowanceExceeded was refused"));
      return yield* new AllowanceExceeded({
        remaining: yield* Handlers.blank("AllowanceExceeded.remaining, an Amount"),
      });
    }

    // Step record: database, span allowance.spend.record.
    yield* steps.record(Handlers.blank("record: the work this step does"));

    // The move spend, from active: one branch per outcome.
    if (yield* Handlers.blank<boolean>("does spend end in active?")) {
      // To active. From there the allowance can: spend (to active or exhausted), revoke (to revoked).
      yield* move("active");
    } else {
      // To exhausted. From there the allowance can: revoke (to revoked).
      yield* move("exhausted");
    }

    return {
      // AllowanceSpent needs remaining, and only the answer can give it.
      remaining: yield* Handlers.blank("remaining, an Amount"),
    };
  });

export default spend;
```

Today's scaffold for the same operation is twenty lines: the description, two step blanks, one refusal with one blank
for all its fields, `move(yield* Handlers.blank("the move’s outcome"))` and one blank answer
(`design/evidence/M1.44/check-19-red.txt` shows the diff).

### allowance's journey stubs

| # | File (`blueprint/journeys/…`) | Path | Expected |
|---|---|---|---|
| 1 | `allowance-grant-created-in-active.ts` | `(creates)` → active by `allowance.grant` | `AllowanceGranted`, in active |
| 2 | `allowance-spend-active-to-active.ts` | active → active by `allowance.spend` | `AllowanceSpent`, in active |
| 3 | `allowance-spend-active-to-exhausted.ts` | active → exhausted by `allowance.spend` | `AllowanceSpent`, in exhausted |
| 4 | `allowance-spend-refused-from-exhausted.ts` | spend from exhausted | `AllowanceNotActive { state: "exhausted" }`, no events |
| 5 | `allowance-spend-refused-from-revoked.ts` | spend from revoked | `AllowanceNotActive { state: "revoked" }`, no events |
| 6 | `allowance-revoke-active-to-revoked.ts` | active → revoked by `allowance.revoke` | `AllowanceRevoked`, in revoked |
| 7 | `allowance-revoke-exhausted-to-revoked.ts` | exhausted → revoked by `allowance.revoke` | `AllowanceRevoked`, in revoked |
| 8 | `allowance-revoke-refused-from-revoked.ts` | revoke from revoked | `AllowanceNotActive { state: "revoked" }`, no events |

Number 5, as its golden (`journeys/allowance-spend-refused-from-revoked.ts.golden`):

```ts
// Scaffolded from blueprint/things/allowance/machine.ts. Yours from now on.
import { Blueprint, noEvents, refuses } from "orthograph";
import { machine } from "../things/allowance/machine.ts";
import { grantee } from "../things/allowance/roles.ts";
import spend from "../things/allowance/verbs/spend.ts";

/**
 * One path through the allowance's machine, from blueprint/things/allowance/machine.ts:
 *   revoked  spend  refused AllowanceNotActive (exit 40, AL-900), because spend starts only from active
 * Refused: the grantee of the allowance calls allowance.spend on an allowance in revoked, and nothing changes.
 */
export default Blueprint.journey("allowance.spend: refused from revoked", {
  cast: { grantee },
  starts: Blueprint.todo("a starting world with an allowance in revoked"),
  steps: (s) => [
    s.step(
      "the grantee calls allowance.spend",
      s.grantee.run(spend, Blueprint.todo("allowance.spend's payload: allowance, amount, memo")),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      machine.isIn(Blueprint.todo("the allowance's id"), "revoked"),
    ),
  ],
});
```

Acme's own journeys already walk paths 3, 4, 5 and 6 (`journeys/spend-within-allowance.ts`,
`journeys/revoke-then-spend.ts`); the stubs show the other four as holes to fill.

## The checks (written first, red on `origin/m1`)

On `claude/k16-checks`, into `m1`, ahead of their build, like checks 16 to 18:

- `packages/projections/src/modules/handlers/handlers.test.ts`: the golden scaffold; the header's citations; no
  undeclared names in the header; allowance's eight paths; no paths for a thing without a machine and no refused path
  for a creating move; the stubs' paths, headers and three goldens. Six red, one existing test passing.
- `e2e/m1/19-scaffold-explains.test.ts`: `ortho generate` writes the golden and it compiles; `ortho add journeys
  allowance` writes the eight stubs, compiling, never overwriting; the model and `check` count their blanks; `check`
  warns on a new outcome and a new error, naming `src/allowance/spend.ts`. Six red; one control (a new step, already
  warned about) passes.

They fail on the unbuilt surface: the scaffold differs from the golden, `machinePaths` and `renderJourneyStubs` are not
exported, `add` has no `journeys` (USAGE), and `check` prints `check ✔` with no warning. The red run is
`design/evidence/M1.44/check-19-red.txt`.

## Slices

M1.44 (the scaffold explains itself, with drift) and M1.45 (journey stubs), on K13's path before M1.43, so Plugged In's
handlers are written from the new scaffold and its journeys start from the stubs. `design/milestones.md` holds them.

## Reversible

The header and body are the generator's text; changing them changes only new scaffolds, never one that is yours. The
drift rule is a warning that can be turned off by name. `add journeys` writes nothing unless asked. The signature
change has two callers.
