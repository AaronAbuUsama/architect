# render

`Render.files({ name, model })`: every file of `generated/` from the model, plus one handler scaffold per operation.
Pure, so it is tested without a file system. `generated/api` is the contract (endpoints built from each operation's
own declaration, wire errors, the handler type); `generated/server` the Worker; `generated/sdk` the typed client;
`generated/cli` the command line. Generated files start with the do-not-edit line; scaffolds say where they came from
and are the project's from then on.

The CLI's session commands are special when the model has the starter's `session.sign-in` and `session.show`
(`internal/cli-session.ts`): `--env <env>` signs in by device code and shows the person that environment's kept session
belongs to; without it they are the operations' own commands. The device flow and the kept session are
`generated/cli/src/session/device.ts`, self-contained, so the CLI needs no package beyond Effect and the SDK.
