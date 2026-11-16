# Stage 2 wayfinding: the allowance's whole life (Gate 1)

Opened 16 November 2026, once stage 1 (L1.01, L1.10 to L1.15) was on `main`.

## What is already built (read from the code, not assumed)

- The language already has `machine` with `to` lists, `notFrom`, `role`, `owner.of(path)`, `anyone`, `signedIn`,
  `read` (its types only), `step.database`, `step.wait`, `idempotent: "request"` and `budget.p95`.
- The compiler names `<Thing>Not<State>` and records `idempotent`, but it does nothing with reads yet.
- The runtime checks roles before the handler and has `move`, the journal and per-request telemetry. It has no
  version column, no idempotency store, no refusal for "not from", and no read handler.
- Sign-in uses the world's signed test tokens (`host-cloudflare/tokens`). Better Auth replaces them in this stage.

## Unknowns, and who answers each

| # | Unknown | Answered by |
|---|---|---|
| U1 | How a move (fields, state, version, journal event) commits atomically on D1, given that D1 rejects `BEGIN` in Workers | research: `@effect/sql-d1@4.1.1` source |
| U2 | The same for a Durable Object owner, through `@effect/sql-sqlite-do@4.1.1` and `transactionSync` | research, then the S3 race test |
| U3 | Whether 50 concurrent local calls really interleave on D1 and on a Durable Object, so that a lost update would show | research, then the S3 race test |
| U4 | Better Auth on workerd and D1 at a version two weeks old, with organization, invitation and API keys, and a test person signed in with no browser | research: npm tarballs |
| U5 | A real OIDC issuer for local sign-in | research |
| U6 | oxlint 1.90 JS plugin rules: their API, their options, and how they report a file | research, then S6 |
| U7 | `create-nx-workspace@24.0.3 --preset` against a local Verdaccio, without touching `~/.npmrc` | research, then S5 (the preset half) |
| U8 | A scripted `claude -p` session that can't read the journeys: its flags and settings, and its auth in CI | research |
| U9 | The idempotency key: its header, store and scope, and what happens to two concurrent calls with one key | decided here, proven by a journey |
| U10 | How a handler's error type is held to exactly the declared union | decided here, proven by a type test |

## Findings

Research done 16 November 2026, by three parallel subagents, from the installed sources, `npm pack` tarballs and
the official docs, at the pinned versions.

### U1 to U3: atomic moves

- `@effect/sql-d1@4.1.1` **can't run `withTransaction`**: `D1Client.ts:340` is
  `Effect.die("transactions are not supported in D1")`. It does expose `D1Client.batch([...statements])`
  (`D1Client.ts:142-206`), which calls `db.batch`, and a D1 batch is atomic: miniflare runs it inside `transactionSync`
  (`d1/database.worker.js:180`). The batch returns rows only, so rows affected are read through `RETURNING`.
- A failed version guard isn't an error, so the batch would go on. To make a lost guard roll back the whole batch,
  the update sets `version = CASE WHEN version = <read> THEN version + 1 ELSE NULL END` on a `NOT NULL` column. A
  stale version then raises `NOT NULL constraint failed`, and the whole batch rolls back.
- `@effect/sql-sqlite-do@4.1.1` binds to `ctx.storage` and runs `withTransaction` through `storage.transaction()`. A
  storage transaction closes the input gate. The repo's own spike (`design/spikes/durable-object.md`) showed that a
  move awaiting anything else races without a one-permit `Semaphore`.
- Locally, D1 is a Durable Object that runs one statement at a time, so separate calls interleave between awaited
  statements, and a read-then-write lost update does show. That makes the race test meaningful.

### U4 and U5: sign-in

- `better-auth@1.7.15` (1 November 2026) is the newest that's two weeks old. `organization` (members, invitations,
  roles) and `bearer` are in core. API keys are `@better-auth/api-key@1.7.15`. The schema comes from the `auth@1.7.15`
  CLI (`auth generate`); `@better-auth/cli` is dead at 1.4.
- `betterAuth({ database: env.DB })` builds its own D1 dialect (`@better-auth/kysely-adapter`, `dist/index.mjs:103`),
  without transactions. It's built per request, because `env` lives in the request.
- A test person signs up for real (`POST /api/auth/sign-up/email`), and with `bearer()` the answer carries
  `set-auth-token`. `auth.api.getSession({ headers })` turns a request into a principal.
- The OIDC issuer is Dex, `ghcr.io/dexidp/dex:v2.46.1` (21 October 2026), with static passwords. Better Auth reads
  it through `genericOAuth`. It's real and light, with no JVM.

### U6 to U8: lint, preset, the scripted agent

- oxlint 1.90 JS plugins are ESLint-shaped (`{ meta: { name }, rules }`, `create(context)`, ESTree visitors) and
  registered with `jsPlugins` in `.oxlintrc.json`. They get no type information. Options are static JSON, so the
  declared names reach `no-name-as-string` through a generated config. Tried for real in a scratch folder.
- `create-nx-workspace@24.0.3 --preset=<pkg>` installs the package, then runs its `preset` generator. The flags are
  `--no-interactive --nxCloud=skip --trustThirdPartyPreset --pm=pnpm --skipGit`. To use Verdaccio without touching
  `~/.npmrc`, set `npm_config_registry` and `pnpm_config_registry` (pnpm 11 reads only the second).
- `claude -p` takes `--settings` (a file or JSON) with `permissions.deny: ["Read(**/journeys/**)"]`,
  `--permission-mode dontAsk`, `--max-turns` and `--output-format json`.
  - A deny on `Read` also covers Grep and Glob as a best effort, but not every shell command. So the session also
    runs in a copy of the project with no journeys in it.
  - `--bare` needs `ANTHROPIC_API_KEY`, which is a credential.

## Consequences

Recorded in `design/decisions/D2-stage-two.md`.
