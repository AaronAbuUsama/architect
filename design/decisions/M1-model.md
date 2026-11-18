# M1.03 complete model

The conductor's 18 November 2026 call is represented by `from: { kind: "app" }` or
`from: { kind: "feature" | "adapter", mount, package, version, thing }` on things and operations.
The existing package paths and mount names continue to drive imports.

`Blueprint.refAny()` declares a value with `{ declaration, id }` on the wire. The declaration is a compiled
thing name, including any mount prefix. The model marks the format as `ref-any` under the structured schema kind,
so the same records and verdict code can handle the object. The schema checks the name's shape and requires a nonempty id.
Checking whether that instance exists belongs to the operation using the reference. API, SDK and MCP use the
declaration's schema. A generated CLI flag accepts the reference as JSON.

The model keys journeys by their project-relative file or package specifier. It names their cast, starting world,
calls, symbolic references and assertions. Selectors are identified by the authored file and assertion position. Starting worlds are keyed by their declared name. Role rules include
the predicate source. Marked private call and assertion fields redact literals. The original journey declarations
remain the proof runner's input. A step whose operation was omitted is marked as skipped in the model.

A blank within an operation's steps has type `blank` and its reason is on the operation and in the model's
`blanks` index. This preserves the existing entry points for work's `mission.tasks`. An operation with an
entire declaration part missing appears in `blankOperations`, outside the executable operation list.

## Proof

Run `node packages/cli/src/main.ts describe --json --root examples/acme` and repeat for `examples/work`.
Acme has eleven journeys and three starting worlds. Work has no journey or starting-world files, and
`mission.tasks` reports the `steps.facts` blank. Both return named role rules and app origins.

In an acme copy, set the health payload to `{ target: Blueprint.refAny() }`. After `ortho generate`, compare
`generated/model/model.json` with `ortho describe --json`. They match byte for byte. The generated endpoint
decodes a reference to an allowance and rejects an empty declaration. Its CLI accepts a JSON object and its docs
display the field as an any-thing reference.

Checks 05 through 08 passed 39 tests locally. The omitted-operation journey through the Docker-backed collector
was excluded as directed by the thread brief. The workerd route checks in 08 ran locally.
