# R1: how new a dependency may be

Decided by Aaron, 17 November 2026.

## The rule

A dependency version, direct or transitive, must have been published at least **three days** before it is added
(was two weeks: AGENTS.md, D2 #79). pnpm enforces it tree-wide: `minimumReleaseAge: 4320` (minutes) in
`pnpm-workspace.yaml`.

## Why

Two weeks kept us off releases we needed, for example `@effect/platform-cloudflare` 4.1.3 and `effect` 4.1.3 (both
10 November), which carry Effect's Cluster and Workflow on Durable Objects (H1 section 8). Three days still skips a
release that is pulled or patched in its first days, which is when most bad publishes are caught.

## The override

A younger version is allowed only by name:

1. Add the package to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, with a comment giving the reason.
2. Add a line to the log below: the package, the version, its publish date, why, and when the exclusion comes out
   (once the version is three days old, the name is removed).

## Overrides

| Package | Version | Published | Why | Remove after |
|---|---|---|---|---|
| (none yet) | | | | |
