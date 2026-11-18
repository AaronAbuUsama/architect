# K3: stores we own, and sources we don't

Decided 18 November 2026. Aaron took option C in the chat ("Yes, take C"). This record widens K2 Q1 and D1 #1 and
supersedes them where they disagree. The new evidence that reopened Q1: Capxul needs data that lives in several
places, including its bench, which is hosted elsewhere on MariaDB. Aaron also asked whether `database | actor | chain`
is really the whole list ("that kind of sounds to me like there could be more places"). It isn't, and this record
makes the list open.

## The problem, in code

```ts
// packages/forman/src/modules/things/types.ts:32
export type Lives = "database" | "actor";
```

```ts
// examples/acme/blueprint/environments/local.ts:6
database: Cloud.d1.local(),
```

A thing picks one of a closed list of homes, and an environment binds exactly one database. Nothing can say "the
ledger is in its own database", and a system we don't own, such as the bench, has nowhere to go.

## The rule that sorts every case

**If Forman owns the schema and every write goes through Forman's commit, the place is a store. If anything else owns
it, the place is a source, and it is reached through an adapter.**

The commit is the test. A store has to take one call's writes, its journal events, its outbox entries and its request
key together or not at all, guarded by a version (`Store.commit` in
`packages/language-effect/src/modules/records/types.ts:62`, which returns `committed` or `conflict`). Only something
that does all of that can be a thing's home.

## Decided

1. **A thing lives in a store.** `lives` takes a declared store, or nothing for the project's default store. The word
   forms stay as shorthands for the built-in kinds: `lives: "actor"`, and `lives: Blueprint.chain({ … })` from L4.01.
   A one-database app changes nothing.

   ```ts
   // blueprint/stores/ledger.ts: the name is the path, "ledger"
   export default Blueprint.store.database();

   // blueprint/things/entry/thing.ts
   import ledger from "../../stores/ledger.ts";
   export default Blueprint.thing({ description: "…", fields: { … }, lives: ledger });
   ```

2. **The kinds are open.** A host or a language supplies a store kind by implementing the store port. Forman ships
   three:

   | Kind | Supplied by | What it is | Lists |
   |---|---|---|---|
   | `database` | `@formants/host-cloudflare` | D1, with a version column | yes |
   | `actor` | `@formants/host-cloudflare` | a Durable Object per instance, its own SQLite, its outbox | no: use a view |
   | `chain` | `@formants/language-solidity` | a contract (M6) | through views |

   A chain is a host (`Host.chain`), and `chain` is the store kind that runs on it (K5, 18 November 2026). The
   commit test holds at the transaction: it is atomic, versioned by the nonce and the contract's state, and the
   contract is its only writer. "Pending until mined" belongs to the caller: a server operation that sends a
   transaction writes two stores, so by item 5 it is a workflow, with S25's generated waiting state in between.

   Later kinds are a package each, with nothing else changing: Postgres or MySQL that we own (through Hyperdrive),
   SQLite on a device for local-first, Noir on Aztec. A kind declares what it can do (lists, search, private state),
   and the compiler refuses a read the kind can't serve, as it already refuses a list over actors.

3. **Some places are not homes.** KV, R2 and caches can't take an atomic commit, so they are never a thing's home.
   R2 holds files, which are fields. A search or vector index is a kind of view. Both are kept from events and can be
   rebuilt.

4. **Environments bind stores only when they differ from the default.** By default every store gets the host's
   default: its own D1, named from the store's path. An environment names a store only to bind it differently. Its
   keys are typed from the declared stores, so a misspelt or missing store fails to compile:

   ```ts
   // blueprint/environments/local.ts
   database: Cloud.d1.local(),                  // the default store, as today
   stores: { ledger: Cloud.d1.local() },        // only when it needs saying
   ```

5. **One call commits to one store.** A call's writes all land in its thing's store. The compiler refuses an
   operation whose steps write to two stores. Work across stores runs as a workflow, as cross-actor work already does
   (delta, Data).

6. **Migrations are per store**, generated from the model diff for each store, ordered per environment. Never for a
   source.

7. **Plugins bring their own stores.** A feature can declare stores. Mounted, a store's name is the mount's name plus
   the store's path, so two plugins never collide. `@formants/auth` keeps Better Auth's tables in its own store, and
   the project never sees them. This is why stores land in M1: auth in M2 needs them.

8. **A source we don't own is an adapter.** The bench is an adapter, for example `@capxul/bench`, mounted at
   `blueprint/adapters/bench.ts`. Its port declares typed calls with declared errors (`candidates.find`,
   `candidates.search`). A handler reaches it only through a step:

   ```ts
   // blueprint/things/shortlist/verbs/add.ts
   steps: {
     candidate: Blueprint.step.call(bench.calls.candidates.find),  // span shortlist.add.candidate, kind "call"
     save: Blueprint.step.database(),                             // our own store
   },
   ```

   The adapter holds the connection string as its own declared secret (`secrets.md`). Its stand-in is real MariaDB
   in a container, loaded from the bench's schema dump. That is rung one of the ladder (Q1 of the frame): the real
   software, not our own fake. Its conformance test runs the same calls against the stand-in and against the real
   bench in staging, so a schema change in the bench fails at the adapter, not inside a handler. Forman never
   migrates it.

9. **Lists that join ours and theirs are views.** An adapter can emit events: a change feed, a poll it runs on a
   timer, or a webhook in through `on:`. A view keeps those events beside our own. A handler that only needs one
   record calls the adapter directly.

10. **The data map shows both.** `generated/data/map.md` and the portal's data page list every store, with its kind,
    binding and migrations, and every source, with its adapter, calls and stand-in.

11. *(Withdrawn, 18 November 2026.)* An earlier K5 draft added "a projection's own state" as a fourth kind of place,
    for agent-native's Postgres. K5's revision builds the portal on Orthograph instead, so nothing needs it: the
    portal's notes are things in the portal feature's own store (item 7).

## Why not the external database as a store (option B)

B looked fine, and it would be right if Capxul owned the bench through Forman. The problem is ownership, not MariaDB.
A store means Forman writes the migrations, adds the version column and is the only writer. The bench has its own
owner, its own schema and other writers. As a store, it would get our migrations run against its tables, a version
check that its other writers never bump (so our commits would silently overwrite theirs), and a journal and outbox that
don't see their changes. If Capxul ever moves the bench into Forman, it becomes a store of a MySQL kind on that day:
the rule above sorts it.

## Open risks

- **Reaching MariaDB from workerd.** Workers can open TCP sockets, and Hyperdrive supports MySQL, but a MariaDB
  driver on workerd is unproved. A spike comes before the database adapter slice (M5.13). If it fails, the adapter
  runs in a small Node host beside the Worker, and the port stays the same.
- **Store names in environments.** The `stores:` keys are identifiers checked against generated types, not free
  strings. If that ever reads as writing a declared name by hand, the fallback is `Store.bind(ledger, …)`.

## Where it lands

- M1.17: stores in the model, and in the compiler and runtime (items 1, 2, 4, 5, 6, 7).
- M5.13: an adapter over a database we don't own, after the workerd spike (items 8, 9).
- M5.06: the data map lists stores and sources (item 10).
