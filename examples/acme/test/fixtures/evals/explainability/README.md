# explainability

**Replaces:** `src/allowance/grant.ts` with `grant.ts` here.
**Breaks:** refuses a limit over 1000 with `AllowanceLimitTooHigh` and logs nothing: no log line or span attribute records the limit or the cap that decided it. Runs on the journey's third step (limit 1001).
**Eval that must fail:** 9, explainability. The docs put "each refusal has the log that decided it" under steps (eval 6); the task for this fixture put it here. Recorded in the journeys README.
**Failure shape:** `allowance.grant explainability ✘ "a limit over the cap is refused": AllowanceLimitTooHigh has no deciding log`.
