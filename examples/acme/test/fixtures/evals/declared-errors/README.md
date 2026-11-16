# declared-errors

**Replaces:** `implementation/handlers/allowance/grant.ts` with `grant.ts` here.
**Breaks:** fails with `AllowanceMemberUnknown`, an error grant never declares (it declares only `AllowanceLimitTooHigh`; `NotAllowed` is computed). Cast with `as never` because the handler's error channel is typed; the break is at runtime.
**Eval that must fail:** 2, declared errors only.
**Failure shape:** `allowance.grant declared errors ✘ "ada grants olga 500": refused with AllowanceMemberUnknown, not one of AllowanceLimitTooHigh, NotAllowed`. Per D2 #14 the call may surface as a defect; the eval must still report the undeclared name.
