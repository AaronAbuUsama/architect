# starter

What `create-nx-workspace <name> --preset=@orthograph/preset` writes: `examples/starter`'s blueprint, handlers and
journeys, `generated/` rendered from the starter's compiled model under the new name (so nothing has to compile
before the workspace's packages are installed), a `package.json` with every `@orthograph/*` package at the preset's own
version and an `ortho` script, a standalone `tsconfig.json`, and ignores for `.ortho/` and `.wrangler/`.
The published package carries the starter under `files/`; in the repository it reads `examples/starter` directly.
