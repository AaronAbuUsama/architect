# book

The logbook's ledger: the `Book` Durable Object (SQLite) holding every verdict and the production releases.
It trusts its caller: the worker has already verified the token and passes its claims as `Provenance`, which is
stored with the row (`ref`, `event_name`, `repository`, `workflow`, `sha`) so a pull request's verdict is never taken for main's.

- `record` adds a verdict; every post is kept. `seq` orders the ledger. A new proof carries its bundle’s `sha256`;
  old hashless records remain readable with null, and no value is backfilled. Initialization adds that nullable column
  idempotently to old books without rewriting their rows (D3 #163). Promotion requires a matching signed hash.
- `verdicts(filter)` is everything matching, oldest first; `latest(filter)` the newest verdict of each operation in
  each environment among those matching (filter on `ref: "refs/heads/main"` for what may feed a release gate).
- `release(version, revision, from)` records a production release once per version; `latestRelease()` is the last.

The Durable Object holds no clock: order is `seq`. State lives in the DO's SQLite, so it survives a restart with the
worker's `--persist-to`. Models are in R2 (`http`'s `models`), not here. Test: through the worker, `local/local.test.ts`.
