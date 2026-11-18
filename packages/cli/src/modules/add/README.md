# add

`ortho add thing | operation | read | journey <name>` plans the files for a new declaration, each gap a
`Blueprint.todo` that compiles and that `ortho check` names. It never overwrites: if any file is there, it writes
none. `--dry-run` prints what it would write. The module only plans; `main.ts` writes.
