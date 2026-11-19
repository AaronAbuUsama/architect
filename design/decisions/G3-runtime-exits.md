# G3: the runtime's exits are 0 to 4 and 120 to 125

Decided 19 November 2026 by the Goal 3 lead, under "Who decides" in `AGENTS.md`, for ledger `HAN-10`.

## The problem, in code

K16 gave the runtime five exits and the blueprint the rest up to the shell's limit:

```ts
// packages/compiler/src/modules/model/internal/exits.ts:7
export const RESERVED_EXITS: ReadonlyMap<number, string> = new Map([
  [0, "success"], [1, "a defect"], [2, "InvalidPayload"], [3, "NotAllowed"], [4, "NotFound"],
]);
const LOWEST = 5;
const HIGHEST = 125;
```

HAN-10 makes `IdempotencyConflict` (a reused request key with another payload) a typed built-in refusal, so it needs
an exit of its own that no declared refusal can take. 0 to 4 are full. The check's first draft took 5, the lowest
declared exit, which blueprints already use (Plugged In's machine `notFrom` and the design pages that draw it,
`design/walkthrough/journey.md:278`, `design/portal.md:592`), so taking it would break projects as they stand, and the
next runtime refusal would move the floor again. (An earlier draft of this record said acme's `AllowanceExceeded` is 5;
it is 41. Corrected after the 🔍 review of #116.)

## The call

The runtime keeps **0 to 4 and 120 to 125**. A declared exit is **5 to 119**. `IdempotencyConflict` is **120**; 121 to
125 are held for the runtime's next refusals (none named yet). No blueprint, fixture or canon page declares an exit of
100 or more (`git grep` on `5d2887ca`), so nothing changes but the compiler's range and its message:
`AllowanceFrozen's exit 122 is the runtime's; pick another` and `… outside 5 to 119, which are the blueprint's`.

| Option | Breaks | Room for the next runtime refusal |
|---|---|---|
| 5, declared from 6 | every blueprint's declared 5 (Plugged In's `notFrom`), the design pages that draw it | moves the floor again |
| share 2 or 3 | the CLI can't tell two refusals apart (the clash K16 was written to stop) | none |
| **120 to 125 held, declared 5 to 119** | nothing today | five more |

## The rest of `IdempotencyConflict`'s row

Code `AR-002` (the runtime's prefix `AR`, after `NotAllowed`'s `AR-001`), HTTP status `409` (a clash with what the
server already holds, as the machine's not-from refusal), no fields (the stored key is the runtime's, never the
caller's to read), listed on idempotent operations only. MCP can't reach it yet: a tool call carries no request key
(ledger `HAN-10`'s note, snag S-16).

## What changes

Every place that said "5 to 125", found by `git grep 125` on `5d2887ca`, moves in the same change as HAN-10:

| Where | Who changes it |
|---|---|
| `K16-the-scaffold-explains-itself.md:331`, `M1-plugged-in.md:39`, `M1-prehandle.md:97`, `milestones.md` M1.47 | the lead: amended in place, citing this record |
| `e2e/m1/19-scaffold-explains.test.ts:184`, `e2e/m1/22-k16-review.test.ts` (22.5), and check 24's refusal of a declared 120 | the checks author |
| `packages/compiler/src/modules/model/internal/exits.ts` (`RESERVED_EXITS`, `HIGHEST`) and its unit test `exits.test.ts:18` | the HAN-10 builder |

No canon page states the range. Before HAN-10 merges, `git grep "5 to 125"` on its head finds only dated records.
- HAN-10's check (`e2e/m1/24-idempotency-conflict.test.ts`) asserts exit 120, code `AR-002`, status 409.
