# Profile records

Profile IDs are derived from the person ID. Handle IDs are derived from the lowercase name.
These IDs let the store arbitrate concurrent claims by primary key. The module also reads
typed records and narrows the signed-in principal before handlers use it.

Run the tests with `pnpm exec vitest run --root examples/links`.
