# sdk-types

Part of the grid runner; see `e2e/grid/README.md`. Interface: `types.ts`.

Judges the generated SDK's types by what they **resolve to**, not by how they are spelled. The SDK's own files are loaded into a TypeScript
program (the checker, not a parser), with the blueprint modules they import stood in by modules written from the model: a thing's fields as
`{ value: { schema: { Type } } }` of the type the model gives them (an id or text is a string, a uint a bigint, a boolean a boolean, a named schema an
opaque object). So the generator's own helpers (`Declared`, `Of<…>`) are run, and one that is tampered with (`Of<F> = never`, `= F`,
`Declared = any`) makes every member that uses it resolve to the wrong thing.

A member must resolve to a string (id, text), a number or bigint (uint, int), a boolean, or for a named schema anything that is not
`any`, `unknown`, `never`, an index signature, a `Promise`, a function or a boxed `Number`/`String`/`Boolean`. A field every call carries may not
be optional or `| undefined`; one a call may leave out must be. The thing's `state` must resolve to exactly the machine's states, and so must an
exported `<Thing>State`. The matrix of shapes and rules is in `../thing-evals/README.md`.
