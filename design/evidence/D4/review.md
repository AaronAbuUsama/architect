# Independent D4 contract review

Verdict: **pass**, corrected contract `66e28fb7d4de77099834b353f571cd7647b8e9c0`.

The reviewer read source and retained spike receipts. It did not edit files or
run tests, rebuilds or services. Its initial block identified this actual path:
generated API imports the whole operation declaration, `uses` imports a dependency
descriptor, and a descriptor holding the foreign callable/mapper imports that
SDK into the client.

The corrected contract keeps both vendor values and callable types out of the
pure descriptor. Runtime implementation and inferred signatures stay in
`src/dependencies/<alias>.ts`; generated server services import that implementation.
A Node-capable Promise dependency closure and client typecheck are explicit author
requirements. The same reviewer found no remaining blocking contract ambiguity.

Promise wait masking, mapper placement and Busy semantics are source-checked
contracts, not a claim that their new runtime checks have passed. L3.01 remains
unbuilt. The three separate spike reviews likewise establish only their stated
source/retained-receipt boundaries; Node 24/Linux portability remains pending.

The same reviewer subsequently passed `3e666e9a2481926554468d894bce4a29ff2308c6`:
the selected descriptor is explicitly a pure metadata entry, alongside the pure
declaration entry. The whole-operation `uses` path may include that selected
metadata; it may not include Worker, Node, vendor runtime or build-only entries.
The consumer closure check and entry-injected private configuration requirement
are consistent across the package rules and D4. This is contract review only.
