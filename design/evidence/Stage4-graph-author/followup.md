# Follow-up: graph oracle independence

Source base: `be58b32c9a337358999aeac41514e460a05ff647`; original author commit
is preserved. The conductor's D4 clarification at `9278116` supplies the accepted
metadata forms. This change edits only owned 05/06/graph-entry and this evidence.

Independent review found that a successful cyclic-fixture compile could have
passed when all dependency-to-dependency `uses` were ignored. The former probe's
`acyclic-snapshot` label was inferred from an external-array mutation boolean;
that boolean did not prove what the constructor retained. The former cycle
acceptance is superseded by the directional observations below.

## Corrected oracles

1. Before any attempted cycle, actual public Compiler/nodeSource output must
   establish A-root consumer dependencies containing A but excluding B, and a
   separate B-root consumer containing both A and B. Both values must match
   public Compare.hashOf. The entry refuses to attempt the cycle if this positive
   control fails. Then link() tries to add B to A's external `uses` array. A typed
   BlueprintInvalid cycle diagnostic is accepted; successful compilation must
   retain the same two directional public dependency bundles and hashes. Reflect's
   boolean never selects a passing boundary. Ignored D-to-D edges, global dependency
   injection, native TDZ errors and unrelated compiler failures cannot pass.
2. A separate A → B → operation check changes only A's project mapping source.
   B's declaration/runtime bytes and an independent C's declaration/runtime bytes
   are checked byte-identical. The B consumer's Compare bundle includes A/B with
   hashOf agreement, while the C consumer includes C and excludes A/B. A's own
   source hash changes; C's own hash and consumer remain unchanged; retained Impact
   stales exactly the A-root and B-root operations. B's own hash may stay stable or
   change: D4 requires the affected dependency bundle to stale, without prescribing
   recursive hash aggregation.
3. A direct third-argument `Blueprint.kit(Fixture, choices, {uses:[quote]})` case
   checks the dependency in both the kit's own operation and its project consumer,
   the printed dependency-to-kit edge, and both retained proofs becoming stale
   when only the dependency mapper bytes change. There is one kit singleton.
4. An operation object in `uses` is rejected only after a valid dependency
   reference compiles and appears in its consumer's public dependency bundle.
   The controlled diagnostic must identify uses/reference/operation, the source
   file, and the accepted kit/dependency domain. Missing uses support cannot count
   as this rejection.

## Captures and limits

`24-final-followup-graph-red.txt`: eleven product RED cases, nine at missing add kit
and two at missing add dependency, after fixture packaging.
`20-followup-collision-red.txt`: nine packed/type/pure-entry controls pass and sixteen
product cases stop at missing add kit.
`25-final-followup-typecheck.txt` and `26-final-followup-lint.txt`: TypeScript and
scoped Oxlint pass. `27-followup-scope-cleanup.txt` records source hashes and cleanup.
The first
`17-followup-collision-red.txt` includes an ENOTEMPTY cleanup failure in one packed
positive control; that is a setup/cleanup failure, not product RED. The exact own
temp directory was removed. Only local owned 05/06 cleanup now uses Node's bounded
filesystem removal retry (three retries of 100 ms); no shared helper was edited.

All behavior assertions remain unreached at the unsupported add kit/dependency
CLI commands. There is no new graph, source-staleness, cycle, metadata-rejection,
empty-handler, runtime, CI or Gate 3 proof. The revised source SHA manifest records
all 19 owned source files separately, preserving the original manifest.
