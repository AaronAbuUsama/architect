# rules

The `ortho/*` oxlint rules: what the types can't see. `no-name-as-string`, `refusal-has-log`,
`declared-errors-only`, `no-wall-clock`, `handler-matches-path` and `no-old-names` (the framework's old names, gone
since M0 and K6, mapped in `design/naming.md`; this repository's own lint runs it too). Rules get no type information, so `ortho
check` writes the project's declared names and each handler's errors into one options object (`ProjectFacts`) from
the model. Three are warnings, for a blueprint that grew past a handler that is already the project's (M1.26, K16 f):
`required-step-used`, `outcome-chosen` (an outcome of a move with more than one that no `move("…")` names; a `move(x)`
whose argument is not literal is not judged) and `declared-error-named` (a declared error the handler never names).
`no-edited-output` is check's drift step: a generated file differing from what the blueprint renders.
