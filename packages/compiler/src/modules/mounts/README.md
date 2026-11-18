# mounts

Owns how a project's mounts (`blueprint/features/<name>.ts`, `adapters/`, `projections/`, each a `Blueprint.use(…)`)
become part of the model ([`design/decisions/M1-plugins.md`](../../../../../design/decisions/M1-plugins.md) sections 4
to 7). `Mounts.fold(layout)` matches each mount to the installed plugin it imports (by identity, through
`BlueprintSource.plugins`), checks its picks, and reads a feature's `things/` with the same layout reader as the
project's, renaming each thing for the mount: kept when the mount's name is the plugin's own, else `<mount>-<thing>`.
Every problem names the mount's file. Test: `mounts.test.ts`.

A feature's `stores/` are read with its `things/` and named `<mount>-<store>`, always prefixed (K3 item 7); a clash with
the project's own store, or another mount's, is refused naming the mount's file.
