# machine-path

**Replaces:** `src/allowance/grant.ts` with `grant.ts` here.
**Breaks:** the handler asks the move to end in `paused`; the machine declares only `active`. Uses `move` from the handler context, which the docs' handlers use and the current `HandlerContext` doesn't have yet (builder adds it with L1.20). If the runtime rejects the outcome before recording it, the eval still must fail on the recorded attempt or the stored state.
**Eval that must fail:** 3, machine path.
**Failure shape:** `allowance.grant machine path ✘ "ada grants olga 500": grant ended in "paused", not one of active`.
