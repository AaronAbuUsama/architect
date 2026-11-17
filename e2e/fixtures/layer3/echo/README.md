# Finished fixture kit and planted failures

The successful `layer` and `repeat` business bodies in `src/runtime/worker-body.ts` are copied unchanged from
`spikes/kit-package-exports/fixture/src/worker.ts` at `c9be9c83`. This author did not implement an alternative successful
handler. A type-only shim/export and the outer `make(choices, declarations)` adapt that existing body to D4's frozen
factory contract. `node.ts` is also copied unchanged. The declaration entry is namespaced as D4 requires; choices add
opaque JSON metadata solely to check canonical choice validation, without changing the repeat business body.

The two `variants/` are independently authored planted failures: an empty handler and a defect. They must fail
through real framework/workerd/prove once kit support exists. An unsupported CLI or blueprint layout is **not** proof
that either negative was executed. Build each variant from its source in the isolated package; do not hand-edit a
generated project file or production handler.
