# Staging proof and publication evidence

The final source candidate is verified by captures 13 and 14. `attempts/` preserves resolved diagnostic runs unchanged;
its README explains their causes and the later checks that closed them. Planned product fail-first runs remain here.

Reproduce from the repository root after installing the pinned dependencies:

- `pnpm exec vitest run --root packages/prove src/modules/promote/staging.test.ts src/modules/promote/promote.test.ts src/modules/build/build.test.ts src/modules/publish/publish.test.ts`
- `bash design/evidence/Staging-proof/verify.sh`
- `node design/evidence/Staging-proof/nested-monorepo.ts`

The nested-monorepo probe is the same public-API check used by capture 07, with its import adjusted for this durable
location. It archives the current full Git commit and checks actual package staging under examples/acme. Its outputs
remain in that project's ignored local publication directory; no registry, cloud account or viewer is started.
