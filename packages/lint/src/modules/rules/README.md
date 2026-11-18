# rules

The `forman/*` oxlint rules: what the types can't see. `no-name-as-string`, `refusal-has-log`,
`declared-errors-only`, `no-wall-clock`, `handler-matches-path` and `no-old-names` (the old package scope, variable
prefix and folder, gone since M0; this repository's own lint runs it too). Rules get no type information, so `forman
check` writes the project's declared names and each handler's errors into one options object (`ProjectFacts`) from
the model. `no-edited-output` is check's drift step: a generated file differing from what the blueprint renders.
