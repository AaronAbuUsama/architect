# Spike: the world's time inside a Worker (M8.05)

Throwaway. A standalone package (its own `pnpm-workspace.yaml` and lockfile), never imported by packages. Milestone
slice M8.05 in `design/milestones.md`, from `design/decisions/K23-time.md` section 6 (first row).

**Question.** Inside a world, what reads the wall clock behind Effect's `Clock`? And can the Worker's entry set `Date`
to the world's time per request on workerd, and what does that cost?

**Answer.** Yes, if "set" means **look up per request through `AsyncLocalStorage`**, not assign. The entry replaces
`globalThis.Date` once, with a proxy whose `now()` and argument-less `new Date()` read the instant stored for the
running request. Better Auth's session and invitation expiry, jose's checks and Effect's default `Clock` then all
follow a stepped clock. 100 concurrent requests in two worlds a month apart read 0 wrong instants. Assigning a
plain global per request instead leaks in 99 or 100 of 100 requests. The cost is about 30 µs per request (one read of the
world's instant from its Durable Object) plus about 50 ns per `Date` read. Two things K23 does not say yet: every
entry must do it (each Durable Object's own entry included), and libraries that time their caches or deadlines with
`Date.now()` stall in a stepped world (viem's block cache is shown below).

## What was tried

Pins: better-auth 1.7.15, effect 4.1.1, jose 6.2.15, viem 2.57.20, kysely 0.29.7 (the versions the repo uses),
miniflare 5.20261101.0-beta (workerd 1.20261101.1, the one wrangler 4.156.1 ships with), esbuild 0.28.2.
`minimumReleaseAge: 4320` holds for transitive versions too.

- `scripts/scan.ts` reads the ESM each library ships and lists every `Date.now()`, argument-less `new Date()`,
  `performance.now()`, `setTimeout` and `setInterval`, with file and line: `findings/wall-clock-reads.txt`.
- `src/world-date.ts` (35 lines) is the patch: `RealDate` is kept, `globalThis.Date` becomes a `Proxy` over it, and
  `inWorld(instant, f)` runs `f` inside `AsyncLocalStorage.run(instant, …)`. It also holds the naive alternative,
  `swappedWorld`, which sets one isolate-wide instant and clears it when the request ends.
- `src/world.ts` is one Durable Object per world holding its clock: an instant (stepped) or an instant, a speed
  and a real anchor (scaled).
- `src/worker.ts` is the entry. For `/w/<world>/…` it reads the world's instant from that Durable Object, then
  runs the route inside `inWorld`. The routes call Better Auth (bearer and organization plugins, real local D1),
  jose (`SignJWT`, and `jwtVerify` with `clockTolerance: 30` as the logbook's `verify.ts:17` does), Effect's
  default `Clock` and scheduler, and a viem public client kept at module scope. `/_world/<world>` sets, advances
  or speeds the clock. The header `x-mode: off | als | swap` picks no patch, the patch, or the naive swap.
- `scripts/run.ts` starts the Worker in workerd through Miniflare, runs 18 checks and the measurements, and prints
  JSON lines; `findings/run.jsonl` is one run with N = 2000.

```bash
pnpm install && pnpm build
node --experimental-strip-types scripts/scan.ts
N=2000 node --experimental-strip-types scripts/run.ts      # exits 1 if any check fails
```

## What was found

### 1. The wall-clock reads (`findings/wall-clock-reads.txt`)

| Library | `Date.now()` | `new Date()` | timers | The reads that matter in a world |
|---|---|---|---|---|
| better-auth 1.7.15 (+ core, utils, better-call) | 77 | 110 | 11 | expiry made by `utils/date.mjs:3` (`new Date(Date.now() + span)`) and checked by `api/routes/session.mjs:155` (session), `:180` (refresh); `plugins/organization/adapter.mjs:774` and `routes/crud-invites.mjs:270,506` (invitations); `state.mjs:144` (OAuth state); `cookies/index.mjs:261,346` (cookie cache); `api/rate-limiter/index.mjs:9,75,98,217` (windows); `@better-auth/utils/dist/otp.mjs:32,38` (TOTP counter); `plugins/jwt/sign.mjs:57,78,124`; `plugins/siwe/index.mjs:33,84,178`; 32 reads in `db/internal-adapter.mjs` |
| jose 6.2.15 | 2 | 3 | 0 | `lib/jwt_claims_set.js:36,139` (`iat`, `exp` when signing), `:82` (the check's "now", unless `currentDate` is passed), `jwks/remote.js:29,59` (remote key-set cache age) |
| viem 2.57.20 (+ ox 0.14.67) | 60 | 6 | 18 | `utils/promise/withCache.js:33,48` (response cache age); `utils/buildRequest.js:139` (an HTTP-date `Retry-After` minus now); `clients/transports/fallback.js:117,130` (latency ranking); `actions/wallet/sendTransactionSync.js:240,273`; `account-abstraction/accounts/toSmartAccount.js:17` (the default nonce key **is** `Date.now()`); SIWE: `actions/siwe/verifySiweMessage.js:17`, `utils/siwe/validateSiweMessage.js:9`, `createSiweMessage.js:20`. The `tempo/` and `op-stack/` reads are in code we don't call |
| effect 4.1.1 | 34 | 2 | 11 | the default `Clock`: `internal/effect.js:2911` (millis) and `:2941–2966` (nanos, from a monotonic source plus an anchor); `crypto/SecureRandom.js:233,255` (`uuidV7Unsafe`, `ulidUnsafe`); `internal/dateTime.js:281` (`DateTime.nowUnsafe`); `Cron.js:676`; span timing reads the fiber's `Clock` (`internal/effect.js:2761,2822`) |
| kysely 0.29.7 | 1 | 5 | 0 | `migration/migrator.js:575` (migration timestamps); the rest are doc comments |
| workerd itself | | | | `process.hrtime.bigint` under `nodejs_compat` is `BigInt(Date.now()) * 1000000n` (printed by the run), so it follows the patch; `performance.now()` does not |

No library keeps its own copy of `Date` or `Date.now` (a grep for `= Date.now`, `Date.now.bind` and
`Date = globalThis.Date` finds none), so every read goes through the global at call time and one patch reaches all of
them. Our own code is already kept off the wall clock by the lint rule; this list is the dependencies'.

### 2. The checks (18 of 18 pass; four runs, same results)

| # | Check | Evidence |
|---|---|---|
| 1 | `Date` keeps its shape | `new RealDate() instanceof Date` and the reverse are true; a subclass of `Date` reads the world; `Date.parse`, `Date.UTC`, `Date()` (string), `structuredClone`, `Object.prototype.toString` unchanged |
| 2 | Better Auth session refused after 8 days | signed up at `2026-11-01T09:00Z` (the world's instant), `expiresAt 2026-11-08T09:00Z`; valid, then `null` after `advance(8 days)`. This is M8.05's done-when |
| 3 | …and after a month | the same, `advance(30 days)` |
| 4 | Control, no patch | the session is stamped with real time (`2026-11-20`) and is **still valid** after the world's month: the gap K23 names |
| 5 | Invitation expiry (`adapter.mjs:774`) | a 48 h invitation; inviting the same guest again is refused (`USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION`) at the start and accepted 3 days on, with the new one expiring `2026-11-06T09:00Z` |
| 6 | jose | a 1 h token made in the world verifies at the start, still verifies 20 s past `exp` (tolerance 30 s), and is refused a month on with `ERR_JWT_EXPIRED` |
| 7 | Two worlds, concurrently | 100 requests alternating between worlds a month apart, each across a real timer, a D1 query, `Effect.sleep` and a Durable Object call: **0** of 400 reads (`Date.now()` before and after, `new Date()`, `Clock.currentTimeMillis`) were the other world's |
| 8 | A Durable Object entry | a Durable Object called from inside a world reads **real** time (`2026-11-20T16:22Z`): the async context does not cross into another object's request |
| 9 | Break it: the naive swap | assigning one global instant per request leaks in **99 or 100 of 100** requests (wanted `2026-11-01`, read `2026-12-01`) |
| 10 | Effect's default `Clock` | millis and nanos both exact for two worlds only 400 ms apart, because workerd's `hrtime` reads `Date` too |
| 11–13 | Effect code that yields | 100 concurrent requests, each 20 yields and 5 real sleeps, never leak, under the default scheduler, under **one** isolate-wide `MixedScheduler`, and in `"sync"` mode: Effect 4 makes a dispatcher per root fiber (`Scheduler.js:141`, `makeDispatcher`), so no batch is shared across requests |
| 14 | viem, no patch | a 4 s block-number cache refetches after 4.5 real seconds (blocks 1 → 2) |
| 15 | viem, stepped | the same cache **never ages** while the world stands still: 4.5 real seconds later it still serves block 3, though the chain has moved on |
| 16 | viem, two worlds, one client | the earlier world is served the later world's cached block (its age is negative, so always "fresh") |
| 17 | `waitUntil` | work that runs after the response still reads the world's instant (written to D1 30 ms later: `T0` exactly) |
| 18 | Scaled world | at speed 720 the world gains 770 s per real second here (12 minutes, plus the request's own time); the instant is fixed within a request |

### 3. What does not work, plainly

1. **Setting `Date` per request without `AsyncLocalStorage`.** Requests in one isolate interleave at every await,
   so a global set at the start of one request is read by the others (check 9). The lookup has to be per async
   context. It needs `nodejs_compat` (or `nodejs_als`), which Better Auth already requires.
2. **One entry is not enough.** A Durable Object's `fetch`, RPC method or alarm starts its own request, and the
   caller's world does not travel with it (check 8). Every entry that runs app code must look up its world and wrap
   itself: the Worker's `fetch`, each Durable Object's entry, queue consumers, `scheduled`, and Workflows steps.
3. **Caches and deadlines timed by `Date.now()` stall in a stepped world.** Time does not pass between steps, so a
   TTL never runs out (check 15) and a `while (Date.now() < deadline)` loop never ends. Found in code, not run:
   Better Auth's `db/revoke-unproven-account-access.mjs:8–9` polls a lock until `Date.now()` passes a 2 s deadline,
   and the lock itself expires 5 s on in the world's time. If its holder dies, the poll spins in real time until a
   step. Its rate-limit windows (`api/rate-limiter/index.mjs`) also never roll over (rate limiting is off in dev by
   default).
4. **Module-level state shared by worlds mixes them.** A viem client kept at module scope serves one world's
   cached block to another (check 16). Anything cached by time across requests is suspect when worlds share an
   isolate.
5. **Times that come from outside the world.** A token made in the world is expired by the real clock (the run
   prints `ERR_JWT_EXPIRED` when it is checked without the patch). The reverse case was found in code, not run: a
   token from a real issuer (GitHub's OIDC token for the logbook, a real JWKS) carries real `iat` and `exp`, so a
   stepped world judges it wrongly. jose takes `currentDate` (`jwt_claims_set.js:82`) for exactly this.
6. **Spans read the world's clock too.** Effect stamps spans with the fiber's `Clock` (`internal/effect.js:2761`).
   With the world's `Clock` provided, as K23 says, or with only this patch, a stepped world's spans carry world
   time and last 0 ms. That conflicts with K23 section 1, where the portal's "observed at" is real time.
7. **Not patched, by design:** `setTimeout`, `scheduler.wait`, Durable Object alarms and `performance.now()` stay
   real, as K23 section 5 expects. Code at module scope, outside any request, reads real time.

## Measurements

From `scripts/run.ts` in workerd through Miniflare on the shared Mac, four runs. The Mac is busy, so the
request-level numbers are noisy.

| What | Cost |
|---|---|
| One `new Date()` plus one `Date.now()`, real vs patched (1,000,000 in a loop in the Worker, median of 7) | 134–144 ns vs 225–240 ns: **85–102 ns more per pair**, about 50 ns per read |
| One `AsyncLocalStorage.run` around a read (once per request) | 1.3–1.7 µs |
| One read of the world's instant from its Durable Object (2,000 in a loop, median of 7) | **28.7–31.5 µs** |
| A whole `/ping` request from Node (`dispatchFetch`, 2,000 each, after a warm-up) | medians 1.8–5.8 ms for every variant, run-to-run noise larger than any difference between them |

So in a stepped or scaled world the patch costs about **30 µs per request**, nearly all of it the read of the
world's instant. Better Auth's sign-in, with a few dozen `Date` reads, adds a few µs on top. The patch is 35 lines and
adds nothing to the bundle. A real world needs none of it.

## The decision it supports

K23's "the entry sets the global `Date` to the world's time" **holds, with three amendments** for M8.06:

1. **How:** install the `Date` proxy once, and per request run the handler inside
   `AsyncLocalStorage.run(worldInstant, …)`. Never assign a global per request.
2. **Where:** every entry wraps, not just the Worker's `fetch`: each Durable Object's `fetch`, RPC and alarm, queue
   consumers, `scheduled` and Workflows steps. Each reads its world's instant (about 30 µs) and wraps. A real world
   skips the patch entirely.
3. **The world's `Clock` is still provided** (K23 section 6) and agrees with the patch, as checks 7 and 10 show.
   The patch is what reaches the libraries; the `Clock` is what our own code reads.

No replacement is needed: there is no clock option in Better Auth, and the patch reaches all of its reads. jose
could take `currentDate` instead, but it doesn't need to.

## Open risks

- **Stalled TTLs and deadlines in libraries** (finding 3.3). Our own code waits through `Timers`; libraries don't.
  For viem in a world: one client per world and chain, with `cacheTime: 0`. Better Auth's cleanup-lock poll can spin
  until a step. A scaled world could let `Date` flow within a request (each read worked out from `RealDate.now()`,
  which workerd moves at each I/O) instead of fixing it per request. That would unstick deadline loops there, but it
  departs from K23's "fixed for the whole request".
- **viem smart accounts' default nonce key is `Date.now()`** (`toSmartAccount.js:17`). With time standing still, two
  accounts or managers made at the same world instant pick the same key. Found in code, not run; it matters for
  Capxul's Safes and relayer. Pass a `nonceKeyManager`.
- **Telemetry timing** (finding 3.6): decide whether spans in a stepped world carry world time (and 0 ms
  durations) or real time. Real time needs a tracer that reads `RealDate`, not the fiber's `Clock`.
- **Tokens and data from real outside parties** (finding 3.5): an adapter or check that verifies a real issuer's
  token must pass real time (`currentDate`). This sits with K23 section 7's `clock: "own"`.
- **Shared module-level state across worlds** (finding 3.4) is a hazard whenever several worlds share one isolate
  locally. Caches keyed by time should be keyed by world too.
- Measured locally only. Stepped and scaled worlds never run on Cloudflare's edge, so the edge cost does not
  matter, but `AsyncLocalStorage` under `nodejs_compat` is the same API there.
- `effect`'s `uuidV7Unsafe`, `ulidUnsafe` and `DateTime.nowUnsafe` read `Date.now()`. Under the patch their ids and
  instants carry world time, which is what we want, but two worlds sharing an isolate share one monotonic id counter.

## TO THE CONDUCTOR

- **Answer:** K23's "set `Date` per request" works on workerd, as an `AsyncLocalStorage` lookup behind a `Date`
  proxy. Better Auth (session refused after 8 days and after a month) and jose follow a stepped clock. Two worlds
  under concurrency never mix (0 leaks in 100 requests; the naive global swap leaks in 99 or 100 of 100). The cost is
  about 30 µs per request.
- **Decision it supports:** K23 section 6 stands, with the three amendments above (ALS not assignment; every entry,
  Durable Objects included; the `Clock` still provided).
- **Steps it changes:** M8.06 takes the three amendments. M8.08 or the chain adapter makes viem clients one per
  world, with `cacheTime: 0`, and passes a `nonceKeyManager`. M8.11 and section 7 say a real issuer's token is
  checked with real time. The telemetry question goes to whoever owns span timing.
- **Path:** the milestone row names `spikes/world-date/README.md`; this brief named `spikes/world-time-in-worker/`.
  The row should point here.
