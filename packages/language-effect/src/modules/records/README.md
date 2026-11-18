# records

Two sides of a thing's stored instances.

- `Store` is the host's: `find` gives an instance with its version, and `commit` applies one call's writes and journal
  entries all at once, or answers `conflict` when an update's version has moved on (D2 #35, #36). `host-cloudflare`
  provides it over D1 and Durable Objects; `storeMemory` holds rows in memory for tests, with the same rules.
- `Records` is the handler's, made fresh for each attempt at a call by `Unit.make`: reads go to the store and their
  versions are remembered, and writes are held back until the wrapper commits them with the move.

Test: `records.test.ts`.
