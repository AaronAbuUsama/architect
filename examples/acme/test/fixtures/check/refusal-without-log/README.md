# refusal-without-log

**Replaces:** `src/allowance/spend.ts` with `spend.ts` here.
**Breaks:** returns `yield* new AllowanceExceeded(...)` with no `Effect.log*` call before it in the same branch.
**Must fail:** `forman check` exits 1 on rule `refusal-has-log`, naming `src/allowance/spend.ts`.
