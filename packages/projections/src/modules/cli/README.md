# cli

The `cli` projection: `generated/cli/`, `<project> <thing> <verb> --<field> …`, one command per operation, built on the
SDK (so it keeps the SDK's retries), with its exit codes and `--json`; the starter's `session` commands sign in by device
code. Its entry `main.ts` is `generated/cli/src/main.ts`, the project's `bin`. Test: `cli.test.ts` (acme's committed
`generated/cli/`).
