# snapshot

`Snapshot.take` judges, for every current operation in every declared environment, what the logbook says (F1 §1, D3 #130 to #133).
It reads the newest `main` verdicts and the latest release, fetches the models they name, reads the rows again and accepts only if
both reads agree (three tries, then `consistency: unavailable`). A cell is `recorded-pass`, `failed` (the newest row decides),
`stale` (a pass whose `operation:` or `thing:` hash has changed, with the keys and both hashes), `unproven` or `unavailable`.
Proofs are judged against the candidate: the newest revision proved in `test` whose model the logbook holds, else the bundle's own.
It never fails; a logbook that is down, a model that is missing or of an unknown shape, or a ledger that will not hold still is a
snapshot with every cell `unavailable` and its reason, and no tick.
Tests: `snapshot.test.ts` over a logbook in memory; `logbook.test.ts` over the real logbook and signed verdicts (ports 9090, 9091).
