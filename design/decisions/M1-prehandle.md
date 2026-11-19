# M1-prehandle: the calls made building M1.46 to M1.48

Decided 19 November 2026 by the 🔨 builder of M1.46 to M1.48, building K16 section g
(`design/decisions/K16-the-scaffold-explains-itself.md`). Each call below is one K16 left open or one the code forced.

## What the runtime reads, and which miss is `<Thing>NotFound`

- **Which fields are read.** Every payload field holding some thing's id (followed back through `from` to an `id`, as
  the role check already does: `access/internal/path.ts`) is read once in the call's unit and handed in as
  `refs.<field>`. The subject is the field that is the operation's own thing's id (`subjectOf`, `move.ts`), handed in as
  `subject`; the from-check now takes that instance instead of reading again, so the role check, the from-check, the
  commit's version guard and the handler see one read.
- **Which miss is refused how.** The compiler (`compiler/…/model/internal/found.ts`) works out the payload field each
  `allowed` entry starts its walk from, mirroring `Access.roleOn`: a `role-of` path's first key when the payload has it,
  else the subject; a bare role the subject, else the field naming the role's thing; `anyone` and `signedIn` read none.
  A field is `NotAllowed` on a miss only when **every** way in reads it; otherwise its thing's `<Thing>NotFound` is in
  the operation's `notFound` and `refusals`. With `[holder, signedIn]` a missing purse gets past `signedIn`, so it must be
  `PurseNotFound`, which `every` gives. A creating move's own-thing field is never refused (it doesn't exist yet).
- **Where the names live.** `OperationModel` gains `refs` and `notFound` (payload field to thing, and to refusal), each
  present only when non-empty; `ThingModel` gains `notFound` only when some operation can refuse with it. acme: only
  `PersonNotFound` (PE-901, exit 4) is generated, for grant's member; allowance's declared `AllowanceNotFound` keeps AL-002,
  exit 43, and is served at HTTP 404 (a declared error named `<Thing>NotFound` is its thing's not-found refusal).
  `signup` and `work` gain one each for operations allowed to `signedIn` (`SheetNotFound`, `RunNotFound`, …).

## People are Better Auth's

Building it on a real world, every grant came back 404: a person is kept by Better Auth (`auth_user`), never in a
`person` table, so the runtime's read of `refs.member` found nothing and refused `PersonNotFound`. The in-memory store of
`prehandle.test.ts` holds a person row, which hid it. `StoreD1` gains `people`: the thing whose id is a `per_` id (Better
Auth's users are `per_` ids, `Auth`'s contract in `language-effect/…/auth/types.ts`), which the generated server names
(`people: thingIn(personThing)`). Its reads come from Better Auth's users (`id`, `email`, `name`); it has no table writes.
A thing that keeps more fields than those would fail to decode, which is the honest failure.

## A creating move the handler didn't store

`prehandle.test.ts` opens a purse whose handler only answers with the minted id and makes the move. The old runtime died
("can't change: it was never stored"). Now `applyMove` stores the instance when a creating move's subject is in neither
the store nor the call's writes: the minted id, then each of the thing's fields the payload or the answer holds by name.
A handler that inserts it itself (acme's grant) is untouched. A field nothing gives is left out, and a store that needs it
fails the commit as a defect, which is honest: the handler should have stored it.

## The context's types

- `subject: InstanceOf<T> | undefined`: undefined for a creating move and when the payload names no instance; the
  handler narrows it.
- `refs: { [K in payload fields declared as a thing's field]?: Instance }`: `Field` carries no thing at the type level, so
  the keys are every field-typed payload field and the values are untyped rows.
- `id`: the thing's id type for a move whose `from` is `[]` **or not known as a literal** (today, `Move.from` is
  `ReadonlyArray<string>`); `undefined` for a literal non-empty `from` and for no move. When M1.44 makes `Operation` keep
  its move's literal type, a non-creating handler's `id` becomes `undefined` with no further change.
- `Served`'s error union is unchanged: `handler.test.ts` pins it (`AllowanceLimitTooHigh | InvalidPayload | NotAllowed
  | NotFrom`), and a `<Thing>NotFound` is refused by tag like `NotFrom`, carried to every surface by the generated wire
  classes and the refusals table.

## Tests and fixtures changed

- `packages/prove/…/prove.test.ts`: acme's coverage line is `runtime refusals 13/17` (was 13/16: grant's
  `PersonNotFound` is one more runtime refusal, reached by no acme journey), and the planted declared-errors fixture's
  message lists grant's refusals as `AllowanceLimitTooHigh, PersonNotFound, NotAllowed`.
- `examples/acme/test/fixtures/evals/who-may-call/main.ts` is "the generated main.ts with only the gate removed": it is
  regenerated from the new `main.ts`, the gate still the only change.
- `generators/…/render/render.test.ts`, `stores.test.ts` and `cli/…/model/model.test.ts` pin grant's refusals and the
  `StoreD1.layer(…)` line; they follow.
- The gate checks `e2e/m1/00-controls.test.ts:112` and `e2e/layer1/02-acme-proves.test.ts:16` pin the same 13/16. A builder
  doesn't edit checks, so the conductor has asked the K16 author to move them.

## Earlier tests

`compiler/…/model/model.test.ts` pinned grant's refusals as `[AllowanceLimitTooHigh, NotAllowed]`; K16's checks (check
19, `handlers.test.ts`) require `PersonNotFound` between them, so that expectation follows K16. The acme model snapshot
gains the new fields and `PersonNotFound`. No code that has shipped moved.

## M1.47: one refusals table, and an exit means one thing

- **The table.** Generated `api/src/errors.ts` opens with `refusals`, one `{ code, exit, status }` row per refusal (declared,
  each machine's, each generated `<Thing>NotFound`, `NotAllowed`). Each wire class reads its code and HTTP status from
  its row; `exits` and `codes` are one-line derivations of it (typed by key), kept for the SDK and the CLI's line. The
  generated CLI looks a refusal's exit up in `refusals`; HTTP reads each class's status; MCP is handed the table.
- **MCP.** A refusal keeps its text line and gains `structured: { refusal, code, exit, status, …the fields the caller may
  see }` (values as JSON: a bigint as its digits). It is added only when the refusal has a row in the table, so code,
  exit and status always come from the one place; the generated server always passes the table. `mcp.test.ts`, which
  hands no table, keeps its old shape unchanged.
- **Exit clashes** (`compiler/…/model/internal/exits.ts`, K16 section g "An exit means one thing"): `ortho model` refuses a
  declared exit the runtime keeps (0 success, 1 a defect, 2 `InvalidPayload`, 3 `NotAllowed`, 4 `NotFound`), one outside
  5 to 125, and one another refusal of the same thing already has (its earlier errors, its machine's `notFrom`), naming
  the error, the exit, whose it is and the thing's `errors.ts`. Exits are unique per thing, not per app. A thing's own
  declared `<Thing>NotFound` may use 4, since it is that refusal. No example in the repo clashes.
- **Tests changed.** `generators/…/render/render.test.ts` pinned `exits` and `codes` as object literals and each class's
  literal code; check 19 requires them to be read from the table, so those lines now pin the table's rows and
  `refusals.<Name>.code`.

## M1.48: an event nothing can fill

`compiler/…/model/internal/fillable.ts`: for each operation that makes a move, each field of the move's event must be
one of the thing's fields, a payload field or an answer field, by name: the places `applyMove` builds the event from.
Otherwise `ortho model` refuses the blueprint, naming the thing's `events.ts`, the event and field, and the operation:
`blueprint/things/allowance/events.ts: AllowanceSpent.note is in none of allowance's fields, allowance.spend's payload or
its answer, so nothing can fill it`. The commit-time check in `applyMove` stays as the runtime's guard. The device-only
rules moved out of `describe.ts` into `internal/device.ts`, to keep it under 250 lines.
