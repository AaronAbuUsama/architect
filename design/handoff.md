# Where everything stands

Kept by the builder after every commit, so a fresh or compacted session continues exactly where the last one stopped.
The narrative of goal 1 (layers 1 and 2, Codex's conductor) is kept as written in
[`history/handoff-layers-1-2.md`](history/handoff-layers-1-2.md).

## START HERE (17 November 2026)

**The goal** is [`goals/02-m0-land-and-rename.md`](goals/02-m0-land-and-rename.md): milestone M0 of
[`milestones.md`](milestones.md), one name and one vocabulary with nothing broken, ending when `nx run e2e:m0` passes
on `main`. Architect is now **Forman** (command `forman`, packages `@formants/*`); Blueprint stays the name of what you
write. The design is the frame ([`frame/`](frame/README.md)), decided in
[`decisions/K2-forman-frame.md`](decisions/K2-forman-frame.md).

**Branch** `m0`, cut from `main` at `bcf92ba`. One commit per slice.

| Slice | State |
|---|---|
| M0.01 the package map | done: [`decisions/M0-packages.md`](decisions/M0-packages.md) |
| M0.02 packages and imports | next |
| M0.03 command, folders, variables | |
| M0.04 lint rule against old names | |
| M0.05 design docs around plugins | |
| M0.06 Gate M0 | |

**Decided so far.** `@formants/forman` is today's `@architect/blueprint` (Effect only); the `forman` bin ships from
`@formants/cli` until M2.09; `target-*` becomes `language-*`; `@architect/std` (an empty kits placeholder) is removed;
records keep the old names (`M0-packages.md` section 5).

**Traps carried over from goal 1** (full list in the old handoff): run `pnpm nx reset` then
`NX_DAEMON=false pnpm nx sync` after any generator change; Gate 2's teardown removes every new container with the
framework's prefix, so don't run two gates at once; a killed Gate 2 run can leave its registry container behind.
