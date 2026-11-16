# who-may-call

**Replaces:** `generated/server/main.ts` with `main.ts` here (only the `allowance.grant` route; organization.create is dropped, so the runner must use this fixture only for the grant journey step, or the builder extends it). A handler cannot plant this by itself, because the runtime checks `allowed` before any handler runs; the break has to be in the gate.
**Breaks:** the server calls `served.run` for every principal with no role check, so bob reaches the handler. The builder should regenerate this fixture from whatever `generated/server/main.ts` the generator emits then, changing only the gate (one change, marked PLANTED). Note the current generated main.ts has no gate at all yet.
**Eval that must fail:** 5, who may call. The eval decides who lacks the role from the world's facts (organization owner = ada's person) and the declaration's `allowed`, never from what the server did.
**Failure shape:** `allowance.grant who may call ✘ "bob is refused and the handler never runs": caller bob (person per_...) lacks owner of organization org_..., and was answered, not refused`.
