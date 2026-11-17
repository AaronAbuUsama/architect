# rules

The `forman/*` oxlint rules: what the types can't see. `no-name-as-string`, `refusal-has-log`,
`declared-errors-only`, `no-wall-clock` and `handler-matches-path`. Rules get no type information, so `forman
check` writes the project's declared names and each handler's errors into one options object (`ProjectFacts`) from
the model. `no-edited-output` is check's drift step: a generated file differing from what the blueprint renders.
