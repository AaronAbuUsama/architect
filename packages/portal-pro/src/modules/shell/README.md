# shell

The frame every Portal Pro page renders in: the sidebar navigation of F2's recommended IA (a catalog of things, with
proof, work and docs as lenses) and the main area. `types.ts` is the module; `internal/nav.ts` holds the fixed entries.
Things and environments join the navigation when the face reads the plain portal's `/_portal/v1` data.
