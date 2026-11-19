# meters

The portal's own small components (design/portal.md, "Component inventory"), built on Pro's CSS tokens and never importing Pro:
`CallsMeter` (a window's calls by outcome), `EnvironmentPill` (an environment as one object) and `Move` (a machine move). Each
has Storybook 8 CSF stories beside it in `internal/`. `BudgetMeter`, `CallsBars`, `SparkBars`, `VerdictMatrix`, `KeyPath` and
`StepCard` come with the slices that need them (the operation page's tabs, the environments page): held.

Tests: `meters.test.ts` renders each on the server.
