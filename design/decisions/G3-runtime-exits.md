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
an exit of its own that no declared refusal can take. 0 to 4 are full. The check's first draft took 5, which acme's
`AllowanceExceeded` declares (and the canon quotes), so every project with a declared 5 would stop compiling, and the
next runtime refusal would move the floor again.

## The call

The runtime keeps **0 to 4 and 120 to 125**. A declared exit is **5 to 119**. `IdempotencyConflict` is **120**; 121 to
125 are held for the runtime's next refusals (none named yet). No blueprint, fixture or canon page declares an exit of
100 or more (`git grep` on `5d2887ca`), so nothing changes but the compiler's range and its message:
`AllowanceFrozen's exit 122 is the runtime's; pick another` and `… outside 5 to 119, which are the blueprint's`.

| Option | Breaks | Room for the next runtime refusal |
|---|---|---|
| 5, declared from 6 | acme's `AllowanceExceeded`, the canon's quotes, any project's 5 | moves the floor again |
| share 2 or 3 | the CLI can't tell two refusals apart (the clash K16 was written to stop) | none |
| **120 to 125 held, declared 5 to 119** | nothing today | five more |

## What changes

- `design/decisions/K16-the-scaffold-explains-itself.md` ("an exit the runtime keeps", "a declared exit is 5 to 125"):
  read with this record; the HAN-10 builder updates the compiler's range and K16's check 19 expectations move with the
  checks author, never the builder.
- HAN-10's check (`e2e/m1/24-idempotency-conflict.test.ts`) asserts exit 120, code `AR-002`, status 409.
