# rules

The `ortho/*` oxlint rules: what the types can't see. `no-name-as-string`, `refusal-has-log`,
`declared-errors-only`, `no-wall-clock`, `handler-matches-path`, `no-viem-outside-chain`, `no-pro-outside-portal-ui` (F7: only `@orthograph/portal-ui` imports HeroUI Pro, said in the diagnostic itself, which the GitHub reporter keeps where it drops `no-restricted-imports`' help) and `no-old-names` (the framework's old names, gone
since M0 and K6, mapped in `design/naming.md`; this repository's own lint runs it too). Rules get no type information, so `ortho
check` writes the project's declared names and each handler's errors into one options object (`ProjectFacts`) from
the model. `no-edited-output` is check's drift step: a generated file differing from what the blueprint renders.
