# impact

What a blueprint change unproves. After every prove, `Impact.record` writes `.architect/evidence/proven.json`: the
model just proven, and for each operation whose evals all passed, the hashes its proof rests on (from
`Compare.dependsOn`: itself, its thing, the things it refers to). `Impact.of` compares today's model with that
ledger: an operation is **stale** when one of those hashes changed, **proven** when none did, **unproven** when it was
never proven. `architect impact` prints it, with each changed declaration first.
