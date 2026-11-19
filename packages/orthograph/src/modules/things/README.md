# things

Owns `Blueprint.thing` and `Field`. A thing is plain, frozen data: its description and its fields. Each field knows
the thing it belongs to, so `Organization.fields.id` used in the allowance is an edge the compiler can follow.

Invariants: no names (the folder names the thing); every thing has an `id` field; `structOf` turns any declared
fields into one Effect schema. Test: `things.test.ts`.

`lives` takes `"database"`, `"actor"` or a declared store (`stores`); the thing keeps the kind in `lives` and the store in
`store`.

Every thing carries `notFound` (K16, M1.46), the runtime's refusal of a missing instance: `{ kind: "not-found", thing }`,
generated as `<Thing>NotFound` (or the thing's own declared error of that name). A journey names it as `Person.notFound`,
the way it names a machine's `notFrom`.

`unique: { <field>: { while: [states] } }` (G4) names fields no two instances may hold the same value of, within the
states in `while` (every state without it). `Thing` carries it as `unique`, and its type remembers the names, so
`Records.findBy` takes only those. The compiler checks it against the thing; the store enforces it at commit.
