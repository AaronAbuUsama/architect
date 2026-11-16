# store

`StoreD1.layer({ tables, actors? })`: target-effect's `Store` on Cloudflare (D2 #35 to #38).

- Things that live in the database are D1 rows: a table per thing, named by the generated server from the thing's
  path, a column per field holding its wire form, plus `state` and `version`. A commit is one D1 `batch` of the call's
  inserts, its guarded updates and its journal entries. The guard sets `version` to NULL when it is stale, so the whole
  batch fails and the commit answers `conflict`.
- Things that live as actors go to their `Actor` Durable Object (see `actors`), one per instance.
- A failing query dies: it is never the caller's refusal.

Tests: `store.test.ts`, the race test for the database owner.
