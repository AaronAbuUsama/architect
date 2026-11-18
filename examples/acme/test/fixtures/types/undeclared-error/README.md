# undeclared-error (types)

**Replaces:** `src/allowance/spend.ts` with `spend.ts` here (imports are relative to that install location).
**Breaks:** the handler fails with `AllowanceLimitTooHigh`, which `allowance.spend` does not declare (it declares `AllowanceExceeded` and `AllowanceNotFound`; `AllowanceNotActive` and `NotAllowed` are computed). No cast: the break must be caught by the types.
**Must fail:** `tsc` (the `types` part of `ortho check`, L1.21 and L1.40): `AllowanceLimitTooHigh` is not assignable to `AllowanceExceeded | AllowanceNotFound`.
**Failure shape (checked):** `error TS2375: Type 'Effect<never, AllowanceLimitTooHigh, never>' is not assignable to type 'Effect<{ remaining: bigint }, AllowanceExceeded, ...>'`.
**Fragility:** it fails because `AllowanceLimitTooHigh` (field `cap`) is structurally unlike `AllowanceExceeded` (field `remaining`). An undeclared error with no fields, or only a `_tag: string`, is assignable to `AllowanceNotFound` (no fields) and compiles; the types are structural, not nominal.
