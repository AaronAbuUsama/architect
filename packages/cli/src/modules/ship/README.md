# ship

What the logbook adds to the commands that look at a change.

- `architect version --next` (`Ship.next`): the version the working model would release as, alone on a line. `1.0.0` when the
  logbook holds no production release. With no logbook found it exits 2 and says how to start one.
- `architect impact` (`Ship.impact`): with a logbook, `changes since <release>` and a line per change, `next <version>`,
  `stale <ops> in <envs>` (or `stale none`), `proven …` and `unproven …`, and it writes `generated/model/changes.json`.
  Without one, exactly what Gate 1 had (the local ledger's lines). A logbook that is set but does not answer prints those local
  lines and a warning on stderr: never a `stale none` it did not check.
- `Ship.changes`: after `architect generate`, writes `changes.json` when a logbook answers; silent when there is none.

- `architect publish --dry-run | --local` (`Ship.publish`, D3 #110): the generated SDK and CLI at `version --next`, as production's `publish`
  list names them (logic in `Publish`, `@architect/prove`). `--dry-run` lists what would go out; `--local` sends it to `ARCHITECT_REGISTRY`,
  builds the CLI binary for this machine and commits the formula to the tap. Test: `packages/prove/src/modules/publish/publish.test.ts`.

The logic is `Releases` in `@architect/prove`; this module is the commands' composition. Test: `ship.test.ts` (ports 9012 and 9013).
