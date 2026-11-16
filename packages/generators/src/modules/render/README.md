# render

`Render.files({ name, model })`: every file of `generated/` from the model, plus one handler scaffold per operation.
Pure, so it is tested without a file system. `generated/api` is the contract (endpoints built from each operation's
own declaration, wire errors, the handler type); `generated/server` the Worker; `generated/sdk` the typed client;
`generated/cli` the command line. Generated files start with the do-not-edit line; scaffolds say where they came from
and are the project's from then on.
