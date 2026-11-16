# source

Where the blueprint's files come from. `BlueprintSource` lists the `.ts` files under `blueprint/` and loads each one's
exports; `nodeSource(projectRoot)` does it with Node's own import of TypeScript. Tests and the CLI provide it; the model
never touches the file system itself.
