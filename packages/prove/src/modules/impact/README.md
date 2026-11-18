# impact

What a blueprint change unproves. After every prove, `Impact.record` writes `.ortho/evidence/proven.json`: the
model just proven, and for each operation whose evals all passed, the hashes its proof rests on (from
`Compare.dependsOn`: itself, its thing, the things it refers to). `Impact.of` compares today's model with that
ledger: an operation is **stale** when one of those hashes changed, **proven** when none did, **unproven** when it was
never proven. `ortho impact` prints it, with each changed declaration first.

With the logbook's word (`Impact.lines(impact, shipped)`) the release's changes, `next <version>` and `stale <ops> in <envs>`
are printed instead of the local `stale` (see `releases`); what the local ledger finds stale is then `locally stale`.
