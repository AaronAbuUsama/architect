# M0: calls made while building

Numbered, appended as M0 runs. Each says what was found, the evidence and what was done.

1. **The collector lost its folder and config under Docker Desktop** (17 November 2026). On `main` at `2ba8bd2`, with
   Docker Desktop 29.7.2 on this Mac, `prove:test` failed `telemetry.test.ts` "drops the person from a record" in every
   run of the file, and passed when run alone. Kept containers showed why: the collector exited at once with
   `open /etc/otelcol/config.yaml: no such file or directory`, then (after the config went inline)
   `open /out/logs.jsonl: no such file or directory`. `Collectors.start` removed and remade the folder under the same
   path, and wrote the config as a single-file bind mount; Docker Desktop's file sharing can keep serving the old
   folder and the old file. Linux CI never sees this. Fixed in `prove`'s telemetry module, behaviour unchanged: the
   folder is emptied rather than replaced, and the config is passed inline (`--config=yaml:…`), with `collector.yaml`
   still written beside it to read. Six runs of the file in a row then passed. This is the only non-rename change in M0's
   code, made so that "nothing broken" can be shown on this Mac.
2. **"`nx run-many -t check test`" read as the workspace's check** (M0.02). No project had a `check` target before
   M0.05 added `docs:check`; the root `check` script is `nx run-many -t lint,typecheck,test && nx sync:check`. M0.02's
   proof runs `check,lint,typecheck,test` and `sync:check`, so both readings are covered.
3. **Two more records** (M0-packages.md section 5): goal 1's prompt (`design/goals/01-…`) and `design/frame/questions.md`,
   the round K2 answered, which quotes the code as it was. The checks author added both to the name check's list.
4. **A generated migration's comment changed** (M0.03). `generated/server/migrations/0001_things.sql` in each example
   says which command rebuilds the local database; the generator now writes `forman dev` there. It is a comment in a
   generated file that stage one rebuilds on every run, not an applied migration's schema, so the rule that applied
   migrations are never edited is kept.
5. **The old design docs' history folder is `design/history/docs-layers-1-2/`** (renamed from the docs subagent's
   first choice), so no live link carries the old name and the docs' word check needs no exception.
6. **Names in wire formats changed with everything else** (M0.03): the server's bundle route (`/_forman/bundle`), the
   collector's and logbook's names (`forman-collector-*`, `forman-logbook`), span scopes and the logbook's OIDC
   audience. Nothing outside this repository reads them yet, and every environment, world and logbook is made fresh
   by the gates, so there is no old state to migrate.
