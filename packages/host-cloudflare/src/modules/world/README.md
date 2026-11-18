# world

`World`, the Durable Object that is one running world, and `toWorld`, which routes `/_world/*` to it. Stage one's
world keeps the cast (`POST /_world/cast` with `{ names }` gives each a person id, made once and kept in the world's
own SQLite storage, and a token signed with the run's secret) and answers `/_world/health`. The clock, the timers
table and the registry of things join it in stage five.

## Worlds in a long-lived environment (D3 #50)

A test environment (`ORTHO_WORLDS=1`, set by `ortho env up` when the blueprint's environment declares a
`lifetime`) holds worlds with lifetimes, one live at a time. `/_world/worlds` is its registry: `POST {id, lifetimeMs}`
makes one (409 `WorldLive` while another lives), `GET` lists the live ones, `DELETE /<id>` destroys one, `POST /reap`
destroys every one past its lifetime and answers `{reaped}`, counting each expiry once. A world is its own `World`
instance, named by its id, holding the cast and an alarm at its expiry. Its data is whatever is above the high-water
mark of every table (`rowid`), taken when it was made, kept in the `_worlds` table in D1; destroying it deletes those
rows and the instance's storage. Limits: actors a world created are not deleted yet, and no R2 binding exists to clear.


Admission and ending are guarded in D1 itself (D3 #170–172). The guarded insert takes every table's marks in the
same statement that takes the single-live slot; a unique partial index enforces that slot. Concurrent callers get
one 201 and the other 409s naming that live world. An id already used by an ended world is 409 `WorldUsed`.
Every teardown deletion and the ending update share one transaction and require that lease still to be live, so
an interleaved duplicate cannot delete a subsequent world's rows. This does not depend on Durable Object input
gates serializing external D1 awaits.

The index is an additive startup upgrade. An old registry containing overlapping live leases fails closed with
the database error; it never chooses a winner or deletes data to repair itself. `world.test.ts` runs this case,
concurrent admission, overlapping teardown and admission/ending handover against real workerd and D1.
