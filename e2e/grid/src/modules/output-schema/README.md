# output-schema

Part of the grid runner; see `e2e/grid/README.md`. Interface: `types.ts`.

Judges an MCP tool's `outputSchema` by running it, not by checking it exists. The schema is compiled with the MCP SDK's own validator
(`CfWorkerJsonSchemaValidator`, what the SDK client uses on every result), then it must accept the answer the operation declares, accept a
refusal, and refuse what is neither. A schema that refuses its own answer makes the SDK client reject every successful call (the false green
of PR #154's first round: a refusal's `status` spread over an answer field also named `status`).

## The matrix

Every shape the evals judge (rows) against every rule (columns). Each cell is **enforced**, with the planted red or green that names it
(`R<row> x <column>`), or **n/a** with its reason. A new rule or shape fills a whole row or column, never one cell. Values come from the model's
type or the run's span, never from the schema being judged; a field with neither is reported unjudged.

| Column | Rule |
|---|---|
| A | accepts the real value (a sample built from the model and the run) |
| B | refuses each JSON kind the field's type is not (other scalars, a fractional number for an integer, null, an array, an object) |
| C | refuses the value with each required field dropped |
| D | refuses a value-less type for a required field (a schema that takes anything, `{}`) |
| E | a field the model lets a call leave out may be absent |

| Row | A | B | C | D | E |
|---|---|---|---|---|---|
| R1 answer, every caller | `output-schema.test.ts` "Plugged In's tools" green | `-kinds.test.ts` "handle typed [string, number]" | `-kinds.test.ts` "every field every answer has must be required" | B's probes include every kind, so a schema taking anything is red: "an answer field that takes anything" | the sample omits optional fields: "an optional public field is judged too" green |
| R2 answer, role sees (optional and role-private fields) | "a field private to roles" red and green | same probes on the fuller sample: "an optional text that takes anything" | n/a: the fields it adds may be absent, and the required ones are R1's | by B, as R1 | n/a: R1's sample is the absent case |
| R3 declared refusal, every caller | "a refusal carries its declared public fields" | `-matrix.test.ts` "R3 x B and D" (only where the schema types the field: an untyped extra is no claim) | `-kinds.test.ts` "matrix: a refusal's fields are required" (`remaining`) | `-matrix.test.ts` "R3 x B and D" | n/a: no declared refusal field is optional in either example; a private one is R4 |
| R4 declared refusal, role sees | "optional role-private uint typed integer" red and green | `-matrix.test.ts` "R4 x B and D" | n/a: a private field may be absent | by B | `-matrix.test.ts` "R4 x C is n/a and R4 x E holds" |
| R5 refusal envelope (`refusal`, `code`, `exit`, `status`) | every green test carries the table's real row | "exit typed number", "code typed [string, number]" | "R3/R5 x drop one" (a branch requiring only `refusal`) | `-matrix.test.ts` "R5 x D" | n/a: the runtime sends all four on every refusal |
| R6 wrong-state refusal (`state`) | `-matrix.test.ts` "R6 x A" | "R6 x B and D" | "R6 x C" | by B | n/a: always carried |
| R7 not-found refusal (`id`) | "R7 x A" | "R7 x B and D" | "R7 x C" | by B | n/a: always carried |
| R8 answer `state` | "R8 x A" and `output-schema.test.ts` "a state an answer carries" | "R8 x B and D" | `-kinds.test.ts` "R6 x drop one: an answer `state`" | by B | n/a: a moving answer always has it |
| R9 the move, `_meta.move` (machine.mcp) | `machine-evals.test.ts` "green: the move as the model has it" | "a list written as a string, a wrong state and another event" | "matrix move x drop one" and "a tool that sends no _meta.move" | n/a: not a typed schema, each key is compared with the model's | n/a: all four keys are always sent |

Not in the matrix: a list read's items and cursor. No generator emits one and the model has no list marker (`design/later.md`, "From the grid (#154)").
