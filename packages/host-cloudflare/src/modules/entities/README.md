# entities

`Entity`, the Durable Object behind a thing that `lives: "entity"`: one per instance, named `<table>:<id>` by the store,
holding that instance's row (wire form), its state, its version and its journal in its own SQLite. `commit` runs
synchronously inside `transactionSync`, so a version check and the writes after it can't be interleaved, and a failure
rolls the whole commit back (D2 #38). `find` gives the row back. The Worker reaches it only through the store
(`store/internal/entities.ts`). Test: `entities.test.ts`, the race test for this owner.
