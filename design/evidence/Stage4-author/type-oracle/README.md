# Inferred Pricing channel oracle correction

The earlier program annotated its `call` as Effect<Reply, PriceUnavailable, Pricing>. That annotation widened away a
possible erroneous `never` failure channel before the assertions inspected it. The final program leaves Pricing's
actual call unannotated, extracts `Effect.Success<typeof call>` and `Effect.Error<typeof call>`, and compares them
with the native callable's Awaited<ReturnType> and the selected project error using Effect's public Types.Equals.
An explicit concrete-channel check rejects the erased/any/never cases before comparison. Only readonly modifiers and
a narrower error tag are normalized; the complete required selected-error shape remains in the equality check.
Existing wrong-field/argument checks also observe the inferred call, not a manually widened annotation.

The compiler-only sanity program retained as `sanity.ts.txt` uses the identical oracle formulas and actual existing
Blueprint error type. It checks any/never/unknown channel rejection and readonly/tag refinement acceptance. It neither
provides a fake Pricing service nor claims the missing generated service typechecked. To reproduce that control,
copy it to `.architect/stage4-type-oracle/main.ts` and its config to the same directory as `tsconfig.json`; then run the
captured compiler command. The real Pricing acceptance test remains RED at the unsupported dependency command, with
its later generated-service type assertions unreached. Captures 17–22 record those distinct boundaries and cleanup.
