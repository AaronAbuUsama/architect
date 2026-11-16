# Stage 3 wayfinding: ship it, across local worlds (Gate 2)

Opened 16 November 2026, once stage 2 (Gate 1) was on `main` (PR 2, merge e9e3194).

## What is already built (read from the code, not assumed)

- `prove` makes one local world: a fresh `.architect/<name>` state folder, D1 migrations applied, `wrangler dev` from
  `generated/server/wrangler.jsonc` on one port, with a signed-test-token or Better Auth sign-in, and the OTel
  Collector in Docker writing `traces.jsonl` and `logs.jsonl`. `--env` accepts only `local`.
- `impact` keeps a ledger in `.architect/evidence/proven.json` and compares models (`Compare.models`, `dependsOn`).
- `packages/logbook` and `packages/portal` exist as empty stubs. The acme example has no `blueprint/environments/`
  and no `architect.config.ts`; the docs' walkthrough has both.
- The nine packages publish to Verdaccio in `tools/e2e/starter.sh`, and Gate 1 check 1 installs from it.

## What Gate 2 must show (goal, stage 3)

`nx run e2e:layer2` replays walkthrough steps 9 to 12, all on this Mac and in CI, with no Cloudflare account:

- a change goes from test to staging to production, with a verdict in each;
- `@acme/sdk` installs from Verdaccio at `architect version --next`;
- the tap formula installs and runs;
- an MCP client signs in with OAuth and calls `allowance.get`.

Real Cloudflare deploys, real npm and Homebrew publishing, Axiom and a real staging sign-in are out of bounds: each is
a config switch for the cloud pass.

## Unknowns, and who answers each

| # | Unknown | Answered by |
|---|---|---|
| U1 | What "deploy" means for a local environment: a long-lived workerd per environment (test, staging, production) with its own state, port and secrets; whether Alchemy (at a version two weeks old) can drive local workerd as well as Cloudflare, or whether `generated/infra` emits Alchemy for the cloud and the local path uses wrangler | research R1 |
| U2 | "Same artefacts, not a rebuild": how a built worker bundle is kept per revision and started unchanged in another environment | research R1 |
| U3 | A test world with a lifetime: a world Durable Object whose alarm destroys it at expiry if the run dies; alarms in local workerd; making and destroying `test-pr-N` in a GitHub Action | research R1 |
| U4 | Signed verdicts: GitHub's Actions OIDC token (claims, audience, JWKS) verified in a worker with `jose`; a real local OIDC issuer for runs on this Mac; a forged or local token refused with 401 | research R2 |
| U5 | Version rules from the model diff, secrets named per environment, and where verdicts live | decision D3, here |
| U6 | Publishing locally: the SDK and CLI as npm packages to Verdaccio; CLI binaries; a Homebrew tap as a local git repository with a formula `brew install` runs, on macOS and on the Ubuntu runner; GitHub releases | research R3 |
| U7 | Real sign-in locally: Better Auth 1.7.15's device authorization flow for the CLI, and an OAuth provider for the MCP server, on workerd and D1 | research R4 |
| U8 | The remote MCP server: `@modelcontextprotocol/sdk` streamable HTTP on workers (or Cloudflare's `agents` / `workers-oauth-provider`), one tool per operation, and an MCP client completing OAuth headless as ada | research R4 |
| U9 | `watch` on the local OTLP sink: the evals over recorded production telemetry, without journeys, excluding coverage; a replay script and a planted slow handler showing as drift | decided here, from prove's existing `Evals.gather` over traces |
| U10 | The portal: a read-only site served by workerd, reading the logbook | decided here |

## Findings

Research done 16 November 2026 by four parallel subagents (R1 to R4), from `npm pack` tarballs, the official docs and
live experiments on workerd, at the pinned versions. Everything they started was stopped.

- **R1, local deploys (U1–U3).** Alchemy's newest usable version is `2.0.0-beta.85` (2 November). Its local mode is
  `alchemy dev`, a foreground session on its own workerd; `deploy` and `destroy` always need Cloudflare
  (`ProviderMode.ts:29`); local D1 delete is a no-op. So it can't be the local deployer. Two `wrangler dev` processes
  with separate `--persist-to` kept separate D1 and R2 state, and survived a restart. `wrangler deploy --dry-run
  --outdir` builds with no credentials, two builds hash the same, and `no_bundle: true` runs the built file unchanged.
  Durable Object alarms fire locally and survive a restart, firing about a second after start, but only while a
  workerd runs; pitfalls are the shared inspector port 9229 and secrets passed as `--var` showing in `ps`.
- **R2, signed verdicts (U4).** GitHub's token comes from `ACTIONS_ID_TOKEN_REQUEST_URL` with `id-token: write` and an
  explicit audience; its issuer is `https://token.actions.githubusercontent.com`, RS256. `jose` 6.2.15 (1 November)
  `createRemoteJWKSet` and `jwtVerify` ran on real workerd; a forged signature
  (`ERR_JWS_SIGNATURE_VERIFICATION_FAILED`), another issuer (`ERR_JWKS_NO_MATCHING_KEY`) and no token were each 401.
  The local issuer `ghcr.io/navikt/mock-oauth2-server:6.1.4` (28 October) starts in 1.3 s warm and mints tokens with
  fixed claims per client id. Fork pull requests get no `id-token` (inferred from the docs; the `ci-oidc` spike
  checks it live).
- **R3, publishing (U6).** Node 24 has no `--build-sea`; SEA is `--experimental-sea-config` plus `postject`, from a
  CommonJS bundle, Node 24.22.2 (27 October). A macOS SEA installed through a local tap with a valid signature. Bun's
  binary failed `codesign -v` before Homebrew touched it. Local taps and `file://` formula URLs work with sha256;
  Homebrew 6's tap trust is satisfied by installing by full name; untap only after uninstall. pnpm publishes an
  untagged prerelease as `latest`, and the unscoped `acme` exists on npm, so Verdaccio needs no-proxy rules for it.
- **R4, sign-in and MCP (U7, U8).** Better Auth 1.7.15 has `deviceAuthorization` (`POST /device/code`, `/device/token`,
  `GET /device`, `POST /device/approve`), one table, pure endpoints that run on our `AuthD1`; approval is claim then
  approve with the person's session. 1.7.15 has no `mcp` plugin; the OAuth 2.1 provider is
  `@better-auth/oauth-provider` 1.7.15 (1 November) with dynamic client registration and PKCE.
  `@modelcontextprotocol/sdk` 1.32.2 (23 October) has a web-standard streamable HTTP transport with no `node:`
  imports; workerd needs its Cloudflare JSON-schema validator. Its client completes OAuth headless through
  `OAuthClientProvider` with `redirectToAuthorization` captured.

U5, U9 and U10 are decided in `design/decisions/D3.md` with the rest. Three spikes remain: `mcp-oauth`,
`single-binary` and `ci-oidc` (D3).
