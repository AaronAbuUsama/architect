# mounts

Owns how a project's mounts (`blueprint/features/<name>.ts`, `adapters/`, `projections/`, each a `Blueprint.use(…)`)
become part of the model ([`design/decisions/M1-plugins.md`](../../../../../design/decisions/M1-plugins.md) sections 4
to 7). `Mounts.fold(layout)` matches each mount to the installed plugin it imports (by identity, through
`BlueprintSource.plugins`), checks its picks, and reads a feature's `things/` with the same layout reader as the
project's, renaming each thing for the mount: kept when the mount's name is the plugin's own, else `<mount>-<thing>`.
An adapter's mount reads its `things/` the same way (its errors live there) and its calls: each call of the adapter is
known by name (`Folded.calls`, by the call object a step holds), the ones `include` names are recorded in `mounts.<name>.calls`,
and its `layer` and declared stand-in are recorded too (section 9.1). Every problem names the mount's file. Test: `mounts.test.ts`.
