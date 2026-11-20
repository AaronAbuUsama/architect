# thing-evals

Part of the grid runner; see `e2e/grid/README.md`. Interface: `types.ts`.

## The matrix: `thing.sdk` and `machine.sdk`

Every SDK type the evals judge (rows) against every rule (columns). Each cell is **enforced**, with the test in `thing-evals.test.ts` (or
`machine-evals.test.ts`) that plants it, or **n/a** with its reason. The output schema's own matrix is in `../output-schema/README.md`.

| Column | Rule |
|---|---|
| A | the type holds what the model says (the right primitive, a derived type from this field, or a named type) |
| B | refuses each wrong kind (another primitive, an array, null, a wrong literal, a boolean literal for a number) |
| C | a field the model has is a member; a missing one is red |
| D | refuses a value-less type for a required field (`undefined`, `never`, `any`, `unknown`, `{}`) |
| E | a field the model lets a call leave out may be absent (`?` or `| undefined`), a required one may not be |

| Row | A | B | C | D | E |
|---|---|---|---|---|---|
| `<Thing>` required public field | "green: each field as the primitive" and "derived from its own declaration" | "an array, a union holding the wrong primitive, and null", "a uint field typed true", "derived type that is an array" | "a type that leaves out a field" | "matrix SDK type x value-less" (`undefined`, `never`, `{}`) and "typed any, or unknown" | "matrix SDK type x value-less": a required field written `?` or `\| undefined` is red |
| `<Thing>` optional or role-private field | "matrix SDK type x optional" green | by A's rows (the same kind check) | n/a: an optional field may be left out of a call, so the member is judged only when present | the same | "matrix SDK type x optional": red when written as required |
| `<Thing>State` (machine.sdk) | "matrix State type" green | "matrix State type": `\| number`, `\| null`, an extra literal and plain `string` are red | n/a: a state is a value, not a record | n/a: a union of literals cannot be value-less (no literal means no type found, which is red) | n/a: a state is never absent |
| event types | n/a: `event.sdk` is not switched on (K14 Q3, held off) | n/a | n/a | n/a | n/a |
