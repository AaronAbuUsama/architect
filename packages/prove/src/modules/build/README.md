# build

`Build.build(root, env)`: a clean git revision’s Worker, bundled once by a credential-free wrangler dry run.
A dirty tree is refused before touching its deployable artefact. Local `dev` and local `prove` still run the
working tree; revision-based test/staging/production flows require a commit.

A complete build is published atomically from a temporary directory to `.architect/artefacts/<revision>/`.
`bundle.json` version 1 records the full clean source commit and sha256. A later build reuses that immutable
artefact, and `Build.find` verifies provenance, revision and bytes. Legacy, partial or altered records are refused:
remove that local artefact, rebuild it and prove it again. No legacy provenance is inferred.

The caller supplies the subprocess environment. Only tooling paths, locale, proxies and certificate settings reach
wrangler; no Cloudflare or other account credentials do. Expected failures are typed `BuildFailed` values.
The bundle hash travels in signed verdicts, so a revision-only old verdict cannot authorize these bytes (D3 #160–164).
Test: `build.test.ts`; `promote/promote.test.ts` covers proof identity and the real promotion flow.

For an existing legacy cache at a clean HEAD, move `.architect/artefacts/REVISION` to
`.architect/artefacts/REVISION.legacy`, using the revision named in the refusal. Run `architect build`, then
`architect prove --env test`, then promote through staging before production. This preserves the old cache for
inspection and every logbook row; the new proof, not the move or rebuild, supplies the missing hash. The legacy
cache recovery is exercised by `build.test.ts` with a real bundle rebuild.
