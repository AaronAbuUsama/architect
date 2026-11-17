# Stage 4 L3.01 graph/collision author receipt

Author-only change based on `5219cf065227b84b9691ee9936d7a7da4f22642f`, on
`author/stage4-graph-checks`. No production source, handlers, shared helpers,
old tests, evals, generic runner or gate configuration changed. The adopted Echo
worker body is untouched. Root retains the integration branch and landing work.

## Captured boundary

`10-final-graph-red.txt`: nine tests fail, eight at unsupported `architect add kit`,
one at unsupported `architect add dependency`. Packed package declaration emit,
esbuild, npm pack and extraction succeeded before each CLI boundary, including
version `0.0.0` in the runtime-integrity case.

`07-final-collision-red.txt`: 24 tests: nine positive packed/type/pure-entry controls
pass and 15 product cases fail at unsupported `architect add kit`. Every negative
first establishes a successful ordinary selection/model/generation; therefore
unknown CLI/layout errors cannot be accepted as the intended diagnostic later.

`02-positive-fixtures.txt`: the nine independent overlay controls pass in isolation.
`11-final-static.txt` and `12-final-lint.txt`: TypeScript and scoped Oxlint pass.
`13-scope-cleanup.txt`: scoped source hashes, size limits and own-resource cleanup.
All commands are captured by the unchanged repository evidence script. The source
base printed by captures precedes these new authored files; `source-sha256.json`
identifies their final exact bytes. Raw terminal captures preserve CLI trailing
spaces; the whitespace check excludes captured `.txt` output only.

The initial `01-positive-fixtures.txt` is a **setup failure, not product RED**. Two
type-only fixture exports were corrected before the accepted positive capture;
the abandoned field-cycle proxy was removed. Its two leaked setup directories
were individually removed, and the cleanup capture verifies they are absent.
Other earlier captures are superseded by the numbered final captures above.

## Authored acceptance

1. Public produced CLI models + public Compare dependencies/hash lookup agree
   with printed sorted/deduplicated provides and used-by edges. Canonical kit and
   dependency identities are used without guessing a private model graph shape.
2. Choice changes, same-version effective runtime bytes (including `0.0.0`) and
   runtime mapper bytes produce patch changes and stale affected consumers.
   A real kit selection K → dependency D → operation O tests transitive source
   and choice changes. `system.health` is an unrelated-operation control.
3. A retained-ledger fixture is built from actual Compiler hashes and checked
   through public `Impact.of`; it tests staleness only. It does not fabricate or
   claim a successful prover/eval run. Transient generation/run outputs and
   absolute checkout locations do not affect dependency identity; a missing
   selected runtime entry fails closed.
4. Namespace enumeration order preserves names, identifiers, codes and tags;
   changed package bytes may legitimately change conservative integrity hashes.
5. Invalid aliases, namespace/export names, normalized identifier collisions,
   duplicate singleton mounts, ambiguous error tags in one union, duplicate final
   codes, reserved AR prefixes, dangling references and missing Worker capability
   each have separate cases. Identifier fixtures use separate XA/XB codes;
   ambiguous tags use EC/QA so unrelated code errors cannot mask those cases.
6. The same-process Compiler/nodeSource entry compiles one project twice, a
   second alias once, and the first again. Both selections resolve one actual
   cached package/class, and the wire tag must remain `EchoProblem`.
7. Cycles use only accepted dependency references. A deliberate post-construction
   external `uses` array link either yields a real compiler cycle diagnostic or
   demonstrates safe constructor freeze/snapshot through public Compare (the
   final consumer has no peer backedge). A native TDZ, recursive crash or generic
   unrelated compiler failure is never accepted. If construction prevents the
   cycle, this proves that boundary, **not** a cycle-detection algorithm.
8. The unchanged existing Probe handler typechecks with declared uses. Removing
   uses must reject its service requirement, including an attempted public
   `Handler<Pricing>` generic bypass. No business handler is newly authored.

## Proof boundaries and remaining work

Every product assertion above is currently **UNREACHED** after the unsupported
CLI commands. There is no claimed collision rejection, graph emission, hash
staleness, retained eval proof, generated service type proof, cached-class proof,
runtime execution, empty-handler proof, deployment, CI run or gate completion.
L3.01 and the stage-wide Gate 3 guard remain open. The separate runtime author
owns raw Promise/Effect semantics and real HTTP/workerd proof; builders must not
edit these checks or fixtures. Root must adopt the exact author commits, rerun
all immediate acceptance once implementation exists, retain all prior gates and
finish the full stage locally and in CI/main.

The concrete transitive syntax (`uses` on dependency descriptors and kit-selection
metadata; accepted references limited to selections/dependencies) was supplied
by the conductor while authoring. No operation-calling-operation syntax or private
IR shape was invented.
