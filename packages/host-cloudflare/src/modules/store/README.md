# store

`StoreD1.layer({ tables, actors? })`: language-effect's `Store` on Cloudflare (D2 #35 to #38).

- Things that live in the database are D1 rows: a table per thing, named by the generated server from the thing's
  path, a column per field holding its wire form, plus `state` and `version`. A commit is one D1 `batch` of the call's
  inserts, its guarded updates and its journal entries. The guard sets `version` to NULL when it is stale, so the whole
  batch fails and the commit answers `conflict`.
- Things that live as actors go to their `Actor` Durable Object (see `actors`), one per instance.
- A failing query dies: it is never the caller's refusal.

Tests: `store.test.ts`, the race test for the database owner.

`Store.list` (L2.04) runs one SELECT in `internal/list.ts`: `WHERE` the equality filters, `rowid` ordered `ASC` or `DESC`, one row more
than the page to know whether another follows. The cursor is the last kept row's rowid, so rows made meanwhile never shift a page.
A thing that lives as actors can't be listed (the compiler refuses a list read of one).
