# K20: a role can be held through another thing's rows

**Status: proposed, waiting on Aaron's grill (20 November 2026).** Drafted by the 📐 Capxul language designer thread
from the questions raised while redrawing Capxul Next on Orthograph. Grounded at `origin/goal/stage-1` `f109821d` and
Capxul Next `50851875` (read only). Line numbers are at those commits.

## The problem, in code

A role is a pure rule over **one** instance of its own thing:

```ts
// packages/orthograph/src/modules/roles/types.ts:15-21
export interface Role<T extends Thing = Thing> {
  readonly kind: "role";
  readonly thing: T;
  readonly rule: (instance: InstanceOf<T>, principal: Extract<Principal, { kind: "person" }>) => boolean;
  readonly of: <const P extends string>(path: P) => RoleOf<T, P>;
}
```

The runtime finds that one instance and calls the rule (`packages/language-effect/src/modules/access/service.ts:41-60`).
Nothing else is read. So any role whose truth lives in *another* thing's rows cannot be written:

- **"A Director of this company."** Capxul's Directors are rows that point at a company, not a field on it. Capxul
  refuses with `NotADirector` (`capxul-next packages/blueprint/src/things/company/refusals.ts:52-59`), used by
  `org.budget.create`, `org.member.grant` and `org.director.add`. Foreman's test drive had to leave the role as a blank:
  `director = Blueprint.todo(...)` (`design/foreman/test-drive-capxul.md`, branch `claude/foreman-c521e2`, finding 3).
- **"A member of this company."** `org.budget.list`, `org.director.list` and `member.list` answer "its Directors and
  members", else `NotAMember` (`capxul-next .../budget/verbs/list.ts:17-24`).
- **"A seat with this budget."** The budget's holder, a person seated on it.

Orthograph's own starter shows the same gap from the other side. Its `owner` role only works because the founder is
copied onto the organisation as a field (`examples/starter/blueprint/things/organization/roles.ts:5`); the
`Membership` thing beside it (`membership/thing.ts:8`, with `organization`, `person` and `role`) can't be used to decide
anything about the organisation.

The same limit decides the second half of this record: **a list cannot be held to the caller's own rows.** A list read
with a role is refused unless the caller names the instance the role is decided on (D3 #60,
`access/service.ts:55`). The work app says so in a comment:

```ts
// examples/work/blueprint/things/mission/verbs/list.ts:4-11
// Open (F5 §4): a list read cannot yet be held to the caller's own rows, so any signed-in person could list every owner's
// missions. Fine for one person and their agents; it must be scoped before work serves more than one owner.
export default Blueprint.read(Mission, { where: ["owner", "state"], order: "newest", page: 20, allowed: [Blueprint.signedIn] });
```

Capxul's `invitation.list` takes an empty payload and answers the invitations sent to the caller's email
(`capxul-next .../invitation/verbs/list.ts:13-24`). Orthograph can't declare that list at all.

## What was already decided

- K2 Q5 (`design/frame/questions.md` Q5, decided in `K2-forman-frame.md:36`): one role model, the code's **rule**;
  `holds` is a shortcut that produces a role, so `.of(...)` and the evals still apply. This record keeps that and gives
  `holds` its shape. It changes one thing: `holds` lives in `orthograph`, not only in the organisations plugin, because
  Capxul's budget seats and the work app's missions need it with no organisations at all.
- `frame/delta.md:62` left "two role models disagree (`holds` and `owner.of`)" to the step that adds the new principals
  (M2.01). This record settles the role half; M2.01 still owns the principals.

## What it touches

| Dependent | Why it cares |
|---|---|
| `orthograph` `roles/types.ts`, `roles/service.ts` | the role's spec gains two declarative forms beside `rule` |
| `compiler` model (`model/types.ts:62-72`, `describe.ts:121`, `found.ts:30`) | `AllowedModel` and `roleRules` carry the declared form, so docs, portal and MCP can say "a Director of this company" instead of a rule's source text |
| `language-effect` `access/service.ts`, `handler/internal/read.ts:56`, `wire/internal/shown.ts:17` | the check reads the holding row; a list narrows by it |
| `host-cloudflare` store | one D1 index per `holds` (the holding field and the person field), generated like G5's per-rule index |
| `prove` `journeys/internal/world.ts:119` | prove checks roles with the same `Access.check`, so it reads the same row |
| grid cells `roles.model`, `roles.docs`, `roles.portal`, `roles.mcp`, `roles.telemetry` | each says who may call; a declared role says it in words |
| M2.01, M2.03, M2.07 | the principals decision, the principals build and the organisations plugin, whose `owner` and `member` become `holds` roles |
| Capxul Next on Orthograph (M7) | nearly every Capxul operation is allowed this way |

## The options: question 1, how a role reads another thing's rows

**Today**, the Director role can't be written:

```ts
// design/foreman/test-drive-capxul.md (claude/foreman-c521e2), the Capxul slice's roles.ts
export const founder = Blueprint.role(Company, { rule: (company, caller) => company.founder === caller.person });
export const director = Blueprint.todo<typeof founder>("a Director of this company: a membership with seat director");
```

**A · Declared holding: `who` and `holds` beside `rule`** (recommended)

```ts
// blueprint/things/company/roles.ts
import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";
import { Membership } from "../membership/thing.ts";
import { machine as membership } from "../membership/machine.ts";

// The person who founded it: a field of the company itself.
export const founder = Blueprint.role(Company, { who: Company.fields.founder });

// A Director: a membership row that points at this company, held by the caller, with seat "director", while active.
export const director = Blueprint.role(Company, {
  holds: Membership.fields.company,          // the other thing's field that points here: Membership, found by identity
  who: Membership.fields.person,             // the row's field that must be the caller
  where: { seat: "director" },               // equality on the row's own fields, typed by their values
  while: [membership.states.active],         // typed states (G5, ST1.14); absent means any state
});
export const member = Blueprint.role(Company, { holds: Membership.fields.company, who: Membership.fields.person });

// blueprint/things/budget/roles.ts: a seat with this budget
export const seated = Blueprint.role(Budget, { holds: Seat.fields.budget, who: Seat.fields.person });

// blueprint/things/budget/verbs/create.ts: unchanged operation shape
allowed: [director.of("company")],
```

The check is one indexed lookup: find a `Membership` with `company` = the company the role is decided on, `person` =
the caller, `seat` = `"director"`, in an active state. `.of(...)` works as today, because a `holds` role is a role. The
compiler refuses a `holds` field that does not point at the role's thing, a `who` field that does not hold a person's
id, and a `where` key the row lacks. `rule` stays for what can't be declared.

**B · An effectful rule that may read anything**

```ts
export const director = Blueprint.role(Company, {
  rule: (company, caller, { records }) =>
    records.list(Membership, { company: company.id, person: caller.person, seat: "director" }).pipe(Effect.map((p) => p.items.length > 0)),
});
```

**C · Copy the people onto the company and keep a plain rule**

```ts
// thing.ts gains directors: Blueprint.value(Schema.Array(PersonId)), kept in step by every membership move
export const director = Blueprint.role(Company, { rule: (company, caller) => company.directors.includes(caller.person ?? "") });
```

**D · Make the caller name their own row (works today)**

```ts
// the payload carries the caller's membership just so the role can be decided on it
payload: { company: Company.fields.id, seat: Membership.fields.id, ... },
allowed: [Blueprint.role(Membership, { rule: (m, caller) => m.person === caller.person && m.seat === "director" }).of("seat")],
// and the handler must still check seat.company === company, or a Director of one company acts on another
```

### You do X → what happens

| Scenario | A · declared holding | B · effectful rule | C · copy onto the company | D · caller names their row |
|---|---|---|---|---|
| Dana, a Director of Northwind, creates a budget | allowed after one indexed read | allowed after the read the rule makes | allowed | allowed only if her CLI first looks up her membership id |
| Dana tries the same on Acme, where she is not a Director | `NotAllowed` | `NotAllowed` | `NotAllowed` | allowed by the role; only a handler check stops her |
| The docs and MCP say who may call | "a Director of this company: a membership of it held by you, seat director" | the rule's source text | the rule's source text | "the holder of the membership you name" |
| Sam is removed as a Director | his next call is refused | refused | refused only if the remove move also rewrote `directors` | refused |
| A list of budgets for "my companies" (question 2) | possible: the runtime can turn the role into a filter | impossible: the rule is opaque | impossible | impossible |

### Rubric

| Axis | A · declared holding | B · effectful rule | C · copy onto the company | D · caller names their row |
|---|---|---|---|---|
| Floor-first | ✅ builds on the list read's equality filters (D3 #60) and G5's per-rule index | ⚠️ simple to add, but the rule turns into Effect code | ✅ works today | ✅ works today |
| Reversibility | ✅ additive: `rule` is untouched | ❌ once rules read anything, nothing can be taken back | ⚠️ the copy spreads into every move | ✅ |
| Blast radius | ⚠️ orthograph, compiler, language-effect, host index, docs and portal text | ⚠️ the same packages, plus every eval that judges a rule | ✅ app only | ✅ app only |
| Correctness | ✅ one checked lookup, typed fields, the compiler checks the edge | ⚠️ any query, any cost, I/O inside an access check | ❌ two copies of who the Directors are, drifting | ❌ the company check moves into each handler, and one forgotten is a hole |
| Fit | ✅ K2 Q5's `holds` that produces a role; same spec style as the frame's `{ service }` | ❌ breaks "a rule is a pure function" and the model's knowledge of roles | ⚠️ | ❌ a payload field that exists only for authority |

**Recommendation: A.** It is the `holds` K2 already promised, written down, and the only option that lets the model
know who may call well enough to explain it and to scope a list by it.

## The options: question 2, a list held to the caller's own rows

**Today**, a list with a role is refused unless the caller names the instance (`access/service.ts:55`); the work app
leaves its list open to any signed-in person (`examples/work/.../mission/verbs/list.ts:4-11`).

**A · A declared role narrows the list** (recommended)

```ts
// examples/work/blueprint/things/mission/verbs/list.ts
export const missionOwner = Blueprint.role(Mission, { who: Mission.fields.owner });
export default Blueprint.read(Mission, { where: ["state"], order: "newest", page: 20, allowed: [missionOwner] });
// GET /mission/list answers only the caller's missions

// Capxul: invitation.list with an empty payload
export const invitee = Blueprint.role(Invitation, { who: Invitation.fields.email });   // compared with the caller's email
export default Blueprint.read(Invitation, { where: [], order: "oldest", page: 50, allowed: [invitee] });

// "the budgets of every company I am a member of", one hop further
export default Blueprint.read(Budget, { where: ["company", "state"], order: "oldest", page: 50, allowed: [member.of("company")] });
// no `company` sent: every company Dana is a member of; one sent: today's check on that one
```

A `who` field holds a person's id or, for `Blueprint.email()`, is compared with the caller's email. When a list's `allowed` holds a declared role (`who` or `holds`) and the caller doesn't name the instance it is
decided on, the runtime adds the role as a filter: rows whose `who` field is the caller, or whose instance the caller
holds a row on. When the caller does name it, today's check runs unchanged. A list allowed only by a plain `rule` role
keeps today's behaviour, and `ortho check` warns that it answers nobody who doesn't name the instance.

**B · An explicit `mine:` on the read**

```ts
export default Blueprint.read(Mission, { where: ["state"], mine: Mission.fields.owner, order: "newest", page: 20, allowed: [Blueprint.signedIn] });
```

**C · The caller always names it (today)**

```ts
export default Blueprint.read(Budget, { where: ["company", "state"], order: "oldest", page: 50, allowed: [member.of("company")] });
// the CLI and portal must first ask "which company?" and send it
```

**D · A current company in the session (tenancy)**

```ts
export default Blueprint.read(Budget, { where: ["state"], tenant: Budget.fields.company, order: "oldest", page: 50, allowed: [member] });
// the session carries one chosen company; every call is held to it
```

### You do X → what happens

| Scenario | A · role narrows | B · `mine:` | C · always named | D · session tenant |
|---|---|---|---|---|
| Olga opens "my invitations" with no company yet | her invitations | her invitations, if `mine` can name an email | can't be declared | nothing: she has no company to be in |
| Ada, owner of two missions, lists missions | her two | her two | must send `owner` herself; anyone may send Ada's id | her two |
| Dana is in two companies and lists budgets | both companies' budgets; she may filter by `company` | can't: `mine` is one field on the row | she picks one company per call | the one her session chose; switching is hidden state |
| The docs say what the list answers | "your missions", from the role | "your missions", from `mine` | "the missions of the owner you name" | "the current company's budgets" |
| A role and the filter disagree | can't: the filter *is* the role | possible: `mine` and `allowed` are two statements | n/a | possible |

### Rubric

| Axis | A · role narrows | B · `mine:` | C · always named | D · session tenant |
|---|---|---|---|---|
| Floor-first | ✅ falls out of question 1 | ✅ small | ✅ today | ❌ a new concept in sign-in, sessions and every call |
| Reversibility | ✅ additive; naming the instance still works | ✅ | ✅ | ❌ hard to undo once sessions carry it |
| Blast radius | ⚠️ language-effect list reads and the store's query | ⚠️ the same, plus a new read key | ✅ none | ❌ auth, every client, every operation |
| Correctness | ✅ one statement of who may see what | ⚠️ two statements that can drift | ⚠️ safe, but the open work list stays open | ⚠️ hidden state decides what a call means |
| Fit | ✅ "falls out for free": the role you wrote is the scope | ⚠️ | ✅ | ❌ "a payload says what it means" |

**Recommendation: A.** The role already says whose rows these are; a second spelling would only drift from it.

## Supersedes

Filled in once Aaron answers, per `AGENTS.md` "One way to supersede".

## Aaron's answers

Waiting on the grill.
