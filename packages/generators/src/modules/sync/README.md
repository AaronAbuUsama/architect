# sync

`Sync.project(tree, root)`: runs the compiler on `root` in a fresh process, renders, writes every generated file,
scaffolds each missing handler, and deletes any file under `generated/` the blueprint no longer explains. Nx drops a
write whose bytes match the disk, so `nx sync:check` fails exactly when someone edited `generated/` by hand, or the
blueprint changed and nobody synced.
