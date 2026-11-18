# answer-shape

**Replaces:** `src/allowance/grant.ts` with `grant.ts` here (imports are written for the installed location).
**Breaks:** the handler answers `{ allowance: 500 }`, a number, where the declared answer is an allowance id (`alw_...`).
**Eval that must fail:** 1, answer shape. Any call to `allowance.grant` in a journey.
**Failure shape:** `allowance.grant answer shape ✘ grant-an-allowance "ada grants olga 500": answer.allowance: expected alw_<id>, got 500`, and `prove` exits 1. The wrapper may already turn this into a defect (D2 #15); the eval must still name the call and the field.
**Other failures expected:** the journey step also fails (answer, events, machine state).
