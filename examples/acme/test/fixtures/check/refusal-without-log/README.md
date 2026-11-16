# refusal-without-log

**Replaces:** `implementation/handlers/allowance/spend.ts` with `spend.ts` here.
**Breaks:** returns `yield* new AllowanceExceeded(...)` with no `Effect.log*` call before it in the same branch.
**Must fail:** `architect check` exits 1 on rule `refusal-has-log`, naming `implementation/handlers/allowance/spend.ts`.
