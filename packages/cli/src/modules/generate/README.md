# generate

`ortho generate` brings one project's `generated/` in line with its blueprint, the same render `nx sync` runs, and
scaffolds `src/<thing>/<verb>.ts` for each operation that has no blanks left. A scaffold is
written once and never overwritten. It says what it changed; a second run says `nothing to change`.
