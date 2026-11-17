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
