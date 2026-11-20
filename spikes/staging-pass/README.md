# Spike: staging-pass

**Question.** What breaks when Plugged In, as it stands on `goal/stage-1`, is deployed to Cloudflare `workers.dev` and its
story or journeys are run against it, before M7.03 (`ortho env up staging`, the infra projection) and M7.04 (deploy and
destroy) are built?

**Answer.** Less than feared and more than nothing. The Worker deploys with plain wrangler, the story runs against it
through the SDK, real sign-up works, and destroy and the leftover listing came back clean on all five runs. But
`ortho prove` cannot reach a deployed URL today (three separate reasons), a Worker cannot export telemetry to another
`workers.dev` Worker, a fresh Worker is not reliably reachable the moment `wrangler deploy` returns, and the generated
`wrangler.jsonc` is local-only. Each snag is below with its slice.

## What was tried

One GitHub Actions job (`.github/workflows/staging-pass.yml`, on push to `spike/staging-pass` and by hand), code in this
folder. Every resource is named `ortho-staging-pass-<run id>-*`. The job:

1. **up** (`up.sh`, wrangler 4.156.1, the repo's pin, published 1 November): `d1 create`, an R2 bucket (a scope probe: Plugged In uses none),
   the sink Worker, `d1 migrations apply --remote`, the Plugged In Worker (`examples/plugged-in/generated/server/main.ts`,
   bundled by wrangler from source), a fresh `AUTH_SECRET` from `openssl rand` piped to `wrangler secret put`.
2. **exercise** (`exercise.ts`): what prove assumes about `local`, probed by hand; a cold burst of sign-ups; the story
   through the generated SDK (claim `aaron`, three links, the public page in order); refusals, idempotency, a claim race;
   latency; whether the Worker's OTLP reaches a sink.
3. **prove** (`prove-against.ts`): `Prove.against`, the library entry `promote` uses, on the deployed URL, as it stands and with an
   https shim plus a telemetry folder fed from the sink.
4. **snapshot** the account while up (`leftovers.mjs ... during`), then **destroy** (`destroy.sh`, `if: always()`, by name), then
   **leftover listing** (`leftovers.mjs`: Workers, D1, Durable Object namespaces, R2 by name through the REST API; fails if any
   carries the run's prefix).

The token and account id were used only in the steps that talk to Cloudflare, only as `secrets.CLOUDFLARE_API_TOKEN` and
`vars.CLOUDFLARE_ACCOUNT_ID`. Nothing was printed or written by hand. (Wrangler's own error text prints the account id in a URL; it is a
repository variable, not a secret, and is not repeated here.) The runtime secret was never shown.

Five runs, all of today's allowance:

| Run | id | up | exercise | destroy | leftover listing |
|---|---|---|---|---|---|
| 1 | 44740311600 | deploy failed twice (10007), no URL | skipped | clean | CLEAN |
| 2 | 44740676676 | ok after one retry | 16 of 20 checks pass; the other four: two info probes (portal, latency), a wrong guess of mine at a discovery path, and the OTLP sink (8) | clean | CLEAN |
| 3 | 44741290058 | ok | 17 of 21; the other four: two info probes, the claim race (10), the sink (8) | clean | CLEAN |
| 4 | 44742019187 | ok | 7 of 22: the edge answered HTML 404 to the first requests (10) | clean | CLEAN |
| 5 | 44742578303 | ok after retries | 19 of 23; the other four: two info probes, the claim race (10), the sink (8) | clean | CLEAN |

While up (runs 3 and 5): 2 Workers, 1 D1 database, 2 Durable Object namespaces (`World`, `Sink`) and 1 R2 bucket of ours. After destroy: none.
The token's scope was never the problem: Workers scripts, D1 and R2 create and delete, and listing Durable Object namespaces were all
accepted. Containers were not tried.

## What was found

Each snag: evidence, then the slice it belongs to.

**What works (so M7 need not build it):** the whole Worker bundles and deploys (5.8 MiB, 1.0 MiB gzipped, startup 126 to 152 ms, so
it fits even the Free plan's 3 MB gzip limit); `d1 migrations apply --remote` applies `0001_things.sql`; real sign-up through
Better Auth works from outside (8 concurrent cold sign-ups, all 200, run 5); the SDK story passes against the deployed URL
(claim, three adds, the page in order, `HandleAlreadyOwned`, `HandleTaken`, anonymous `NotAllowed`, one claim per request key);
`/mcp` answers 401 with a challenge that names the deployed origin, and the protected-resource document is served; `/_world/*`
is a 404 in `staging`; the Worker answers `x-trace-id`; `wrangler delete --force` removes a Worker and its Durable Object
namespace; the leftover listing worked on all four resource kinds.

### M7.03: the infra projection

1. **The generated `wrangler.jsonc` is local only.** It carries the all-zero placeholder `database_id`, `OTLP_URL: ""`, no
   `workers_dev` or `preview_urls`, no environment name or revision, and no mention of `AUTH_SECRET` (which `Env` requires). The spike
   derived a config (`config.mjs`); the projection must do the same, and the order is forced: D1 id first, then migrations, then deploy, then secret.
2. **Unset `workers_dev` and `preview_urls` turn both on.** Wrangler warned (run 2): "it will be enabled for this deployment by
   default", "Preview URLs will be enabled". The projection must say both, out loud (the spike set `workers_dev: true`, `preview_urls: false`).
3. **Plugged In has no `staging` environment.** `blueprint/environments/` holds `local.ts` and `test.ts` only. `Cloud.cloudflare(...)` is
   declared and carried into the model (`model.environments[].cloud`), but nothing consumes it: `promote` prints
   `skipped cloudflare (cloud pass)` (`packages/prove/src/modules/promote/service.ts:43`).
4. **One migration, rewritten in place.** `generated/server/migrations/0001_things.sql` says "migrations between versions arrive in stage
   three". Wrangler records applied migrations by file name, so a changed blueprint will not reach an existing D1. Fine for staging that
   is created and destroyed each run; wrong for a staging that is promoted revision to revision. (Read from the code and wrangler's
   behaviour, not run.) The auth tables are not in the migration: Better Auth makes them on first use. Eight concurrent first sign-ups all
   succeeded (run 5), so that race did not show.
5. **No portal in the Worker.** `/portal` answers 404 "The portal's client is not installed in this Worker" because the client needs the
   HeroUI Pro licence (`server-config` README). The projection's build must run in the job that holds it.
6. **`/_ortho/bundle` stays a 404 `NotAnEnvironment`** until both `ORTHO_REVISION` and `ORTHO_BUNDLE_SHA256` are set (the spike set only the first). `env up` must set both.
7. **R2 and the `World` Durable Object are not exercised.** Plugged In has no R2. `World` is deployed and its namespace is made, but
   `/_world/*` is closed in staging, so nothing uses it. It still has to be destroyed, and was.

### M7.03 and prove: telemetry

8. **A Worker cannot export OTLP to another `workers.dev` Worker.** From the sink Worker, `fetch` of the main Worker's `workers.dev` address
   answers `error code: 1042` (runs 3, 4, 5). The main Worker's `OTLP_URL` pointed at the sink: zero posts arrived in runs 3, 4 and 5 (run
   2's in-memory sink was no proof either way). So the design where `promotesFrom: "staging"` gives staging "a collector of its own" (a local
   process, `environments` README) cannot work for a deployed staging: Cloudflare cannot reach it, and a sink on `workers.dev` is refused.
   The sink must be a real external host (Axiom, via `OTLP_SINKS`) or `Telemetry.serve` must take a service binding.
9. **Prove reads a Collector's folder, and nothing writes one in the cloud.** Whatever the sink is, `Prove.against` wants `telemetry`
   as a folder of `traces.jsonl`, `logs.jsonl`, `metrics.jsonl`. With an empty one, every step reports "telemetry missing: no span of this call
   reached the collector" (local replay, below). The sink Worker was built to be polled into that shape (`/dump/<signal>`), but nothing
   reached it, so the pull was never tested.

### M7.04: deploy and destroy

10. **A new Worker is not reliably reachable when `deploy` returns.** Run 4: the first requests got Cloudflare's own HTML 404 page
    (cold sign-ups `404,404,500,404,500,404,200,404`; 15 of 22 checks failed). Runs 3 and 5: one of 6 to 8 concurrent losing claims answered a bare 404
    (the SDK dies on an "undeclared status code"; exactly one claim always won). The same race run 36 times locally under `wrangler dev` was always one 200 and
    seven `HandleTaken`. Likely the new version not yet live in every location (not proven; the 404 body was not kept).
    `up` needs a warm-up that waits for several consecutive good answers, not one, before the story starts.
11. **`wrangler deploy` of a brand-new Worker fails about half the time after it has uploaded.** 5 of 10 first deploys (runs 1, 2 and 5) died
    with `This Worker does not exist on your account [code: 10007]` on `GET /workers/workers/<name>` (wrangler reading the subdomain it is about to
    enable). A second `wrangler deploy` 20 seconds later always succeeded (5 of 5). The REST fallback (`subdomain.mjs`) never ran. Wrangler 4.165 exists;
    4.164.0 is old enough to try; the spike did not.
12. **Destroy by name worked, and is the only safe way.** `delete --name N --force` (Worker and its namespace), `d1 delete -y`, `r2 bucket delete`. Each took 1 to 4
    seconds. The destroy step needs no state from `up`, so it still cleans when `up` died halfway (run 1).
13. **Run time.** About 2.3 to 3 minutes of job, of which install is most; `d1 create` 1 to 3 s, migrations 1 to 2 s, main deploy 7 to 9 s, secret 1 to 2 s.

### prove

14. **The CLI cannot do it.** `ortho prove --env` is `local` or `test` (`packages/cli/src/main.ts`). The library has `Prove.against({ root, url, telemetry,
    state })`, which only `promote` calls, and only for a local `wrangler dev` named staging.
15. **Prove speaks only `http:`.** The plain prove step in every run that reached it (2, 3, 4, 5): `ERR_INVALID_PROTOCOL` (`Protocol "https:" not supported`), from
    `packages/prove/src/modules/journeys/internal/world.ts:34`, where sign-up posts with `node:http`'s `request` (chosen to send no `Origin`).
    `prove-against.ts` shimmed it to `https.request`; that is a spike-only patch.
16. **Past that, prove dies reading facts.** With the shim, run 3, 4 and 5: `TypeError: call.journal.find is not a function` at `journeys/internal/checks.ts:83`.
    Without `state` prove reads `/_world/facts/journal`, which is closed in staging, and takes the 404 body for a journal. `state` is a
    folder holding D1's SQLite file; `database-facts.ts` says "in the cloud pass the same two reads go to D1's own API". That reader does not exist.
17. **Local replay of the rest** (a local `wrangler dev` named staging, `state` pointed at its D1 folder, an empty telemetry folder, no cloud):
    the journeys' answers pass, and every step fails on telemetry (snag 9). The same run twice also failed `starting world claimed:
    handle.claim answered 422 HandleTaken; no step ran`, because the starting worlds claim fixed names (`claimedname`, `releasepage`, ...): a
    deployed database must be fresh for each prove.
18. **Identity is the good news.** `Identity.testPrincipals` and `/_world/cast` are local; prove already has a real sign-up path
    (`signUpPeople`), and the same Better Auth routes worked on the deployed Worker, so the story's first step (sign up) can run there.

### Runtime and scaffold

19. **Claims under real concurrency** (see 10) are the one runtime question the spike could not close: exactly-one-winner held every time, but a loser's answer
    is not always `HandleTaken`.
20. **Latency from a runner to the edge** (not a verdict; includes TLS per call): first claim 507 ms, adds 253 to 414 ms, reads p50 115 to 202 ms,
    p95 243 to 357 ms. The declared `p95: 150 millis` budget is judged from spans, which need snag 8 fixed first.
21. **MCP discovery** is served at `/.well-known/oauth-protected-resource` (200) and `/api/auth/.well-known/openid-configuration`; the
    root `/.well-known/oauth-authorization-server` is a 404. Not judged.

## Measurements

See the table above and the numbers inline. Per run: D1 create 1 to 3 s; sink deploy 3 to 9 s; main deploy 7 to 9 s; migrations 1 to 2 s; destroy 6 to 8 s in all.
The story's four calls took 253 to 507 ms each; the whole exercise 10.7 s (run 5).

## The decision it supports

- **M7.03** projects a real wrangler config per environment (snags 1 to 7) and decides the staging telemetry path before anything else (8, 9): an external OTLP sink (Axiom), or a service-binding exporter. A collector on the machine that
  runs `env up` cannot work.
- **M7.04** deploys with one retry after a pause (11), warms up before handing the URL on (10), and destroys by name with a prefix (12), then lists.
- **`ortho prove` against staging** needs three things nobody has built: an https-capable client, a D1 facts reader (REST or a `wrangler d1 execute --remote`), and a telemetry source that a Worker can reach. Until then the
  staging step of `e2e:stage1` can run the story through the SDK (it passed here), and cannot run prove's journeys or evals.
- Per `M7-cloud.md`: per-Worker secrets worked as decided: `wrangler secret put` on the Worker, gone with `delete`.

## Open risks

- The loser's 404 in the claim race (10, 19): cause unproven; one more run with the response body kept would settle it.
- Snag 11's retry hides a wrangler or API bug; a newer wrangler might not have it. Untested.
- Containers (K10's scope) and a Free-plan account were not tried; D1 behaviour past one database, Workers limits on 8 concurrent isolates, and costs beyond a few
  minutes of a few resources were not measured (the account was never near the cap).
- Snag 4 (migrations) was read, not run. The local 36-claim race was a throwaway script, not committed.
- The sink's content type and the exporter's JSON shape were never seen, so "feed prove's folder from the sink" is untested.

## TO THE LEAD

- **Answer:** Plugged In deploys to `workers.dev` and its story passes through the SDK against it today. `ortho prove` cannot target it: https (`world.ts:34`),
  D1 facts (`checks.ts:83` dies without `state`) and telemetry (no collector Cloudflare can reach; `workers.dev` to `workers.dev` is error 1042) are all missing.
- **Clean:** destroy and the leftover listing were clean on all 5 runs (44740311600, 44740676676, 44741290058, 44742019187, 44742578303). Nothing was left running.
- **Changes to the plan:** M7.03 owns the staging telemetry decision and a real wrangler config (incl. `workers_dev`, `preview_urls`, a `staging` environment file);
  M7.04 owns retry-on-10007, a warm-up, and destroy by name; a new slice (or M7.04's) owns "prove against a URL" (https client, D1 facts reader, cloud telemetry source). The goal's "latest
  staging run deployed, ran the story, destroyed" can be met with the SDK story before prove is ready.
- **No new decision ID was minted.** If you want the telemetry choice recorded, ask for one.
- **Runs used:** 5 of 5 today. A sixth, to capture the claim-race 404 body, needs tomorrow's allowance.
