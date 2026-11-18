# @orthograph/cli

The `ortho` command. `src/main.ts` is the entry and the only file that touches the process; each command is a
module under `src/modules/` that returns what it has to say. Commands so far: `ortho model [--json] [--root <dir>]`.
