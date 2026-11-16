# steps

**Replaces:** `implementation/handlers/allowance/grant.ts` with `grant.ts` here.
**Breaks:** returns an answer without ever calling `steps.insert`, so the declared step `allowance.grant.insert` has no span.
**Eval that must fail:** 6, steps.
**Failure shape:** `allowance.grant steps ✘ "ada grants olga 500": declared step allowance.grant.insert ran no span`.
