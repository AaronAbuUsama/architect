# check

`architect check`: what must hold before a project is proven, in five parts, each printed with ✔ or ✘ and every
finding named by file, line and rule.

- **blanks**: every `Blueprint.todo` in `blueprint/`, grouped by its thing. Any blank fails.
- **types**: tsc on the project (`internal/tools.ts`).
- **rules**: oxlint with only the architect rules from `@formants/lint`, given the project's facts from its model
  (declared names, errors, which handler belongs to which operation). Files are passed one by one, so a project kept
  inside an ignored folder is still linted.
- **drift**: `generated/` must be exactly what the blueprint renders. A differing, missing or extra file is the rule
  `no-edited-output`.
- **ratchets**: `.architect/ratchets.json` maps a rule to the findings it still allows. Counts only go down; a ratchet
  above its findings asks to be lowered.

`run` reads the project and runs tsc and oxlint; it writes only `.architect/check/`. `main.ts` prints and sets the
exit code.
