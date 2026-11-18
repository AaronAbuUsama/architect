# things

Owns `Blueprint.thing` and `Field`. A thing is plain, frozen data: its description and its fields. Each field knows
the thing it belongs to, so `Organization.fields.id` used in the allowance is an edge the compiler can follow.

Invariants: no names (the folder names the thing); every thing has an `id` field; `structOf` turns any declared
fields into one Effect schema. Test: `things.test.ts`.
