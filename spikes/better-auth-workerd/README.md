# Spike: Better Auth 1.7.15 inside a Cloudflare Worker on local workerd

Throwaway. Standalone package (own `pnpm-workspace.yaml`, own lockfile), like `spikes/effect4-worker-chain/`.
Never imported by packages.

## Question

Can Better Auth 1.7.15 run in a Cloudflare Worker on local workerd (wrangler 4.156.1) with a real local D1 database, so
an Architect-style server can (a) sign people up and in over HTTP, (b) turn `Authorization: Bearer <token>` into a
principal, (c) create an organization, invite a member by email and have them accept, and (d) create and verify an API
key, with ids carrying Architect prefixes?

## Tried

Exact pins (all published at least two weeks before 16 Nov 2026; `minimumReleaseAge: 20160` is also set in
`pnpm-workspace.yaml`, so transitive versions obey it too):

| Package | Version |
|---|---|
| better-auth | 1.7.15 (published 2026-11-01) |
| @better-auth/api-key | 1.7.15 |
| @better-auth/core / @better-auth/utils / better-call | 1.7.15 / 0.5.1 / 1.4.4 (peers of the api-key plugin) |
| kysely | 0.29.7 |
| zod | 4.5.4 |
| auth (CLI) | 1.7.15 |
| wrangler | 4.156.1 |
| @cloudflare/vitest-pool-workers | 0.23.0 (prints a rename notice to `@cloudflare/vitest-plugin`; same as the template spike) |
| vitest | 4.1.12 |

Layout:

- `src/auth-options.ts`: the options shared by the worker and the schema script: `generateId`, plugins.
- `src/auth.ts`: `makeAuth(env, origin)`, built per request with `database: env.DB`.
- `src/worker.ts`: routes. `/api/auth/*` goes to `auth.handler`; `/me` is the principal route; `/spike/*` are thin
  wrappers over `auth.api.*` (server-side calls with the request's headers) so the flow can be driven over HTTP.
- `test/flow.ts`: the whole proof as one function over a `fetch`. Run two ways:
  - `scripts/e2e.ts`: real `fetch` from Node to a running `wrangler dev --port 8801` (outside the worker).
  - `test/auth.test.ts`: `SELF.fetch` inside vitest-pool-workers.
- `scripts/generate-schema.ts` writes `migrations/0001_better_auth.sql` (see Found 1).

Commands:

```bash
pnpm install
node --experimental-strip-types scripts/generate-schema.ts      # writes migrations/0001_better_auth.sql
npx wrangler d1 migrations apply spike-db --local
npx wrangler dev --port 8801 --inspector-port 8809                    # default scrypt hasher
node --experimental-strip-types scripts/e2e.ts                        # exits 1 on any failed check
npx wrangler dev --port 8801 --inspector-port 8809 --var PASSWORD_HASH:pbkdf2   # cheap hasher
npx vitest run                                                        # same flow inside vitest-pool-workers
npx wrangler deploy --dry-run --outdir <dir>                          # bundle size
```

`BETTER_AUTH_SECRET` is a locally generated throwaway in `.dev.vars` (gitignored). Test passwords are throwaway.

## Found

**Answer: yes.** Every item passed, against real workerd and real local D1, with no mocks. `scripts/e2e.ts` exited 0
against `wrangler dev` (scrypt and PBKDF2 runs) and `vitest run` passed.

### 1. Schema

`npx auth generate` does not work without a live database connection: with no `database` in the config it prints
`Only kysely adapter is supported for migrations`, and `--adapter kysely --dialect sqlite` does not change that. So the
SQL comes from the same function the CLI uses (`getMigrations(...).compileMigrations()` from `better-auth/db/migration`)
with a Kysely `DummyDriver` + SQLite adapter, which needs no database and no native module. That produces 8 tables
(user, session, account, verification, organization, member, invitation, apikey) and 10 indexes in
`migrations/0001_better_auth.sql`, applied with `wrangler d1 migrations apply spike-db --local` (19 commands). Types:
all ids `text`, dates `date` (ISO strings), booleans `integer`. `session.activeOrganizationId` is added by the
organization plugin. `apikey` has `configId` and `referenceId` (the owner: a user id or an org id), not `userId`.

### 2. Sign-up and sign-in over HTTP (from Node fetch to `wrangler dev`)

| Request | Status | Body |
|---|---|---|
| sign-up | 200 | `{token, user:{id:"per_...",...}}`, `set-auth-token` header present, plus a `Set-Cookie` |
| sign-in | 200 | same; `set-auth-token` present |
| sign-in wrong password | **401** | `{"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}`, no token |
| sign-in unknown email | **401** | identical body (no user enumeration) |
| sign-up duplicate email | **422** | `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` |
| sign-up 1-char password | **400** | `PASSWORD_TOO_SHORT` (minimum is 8) |

The `set-auth-token` value is the signed form `<token>.<signature>` (77 chars); the JSON body's `token` is the unsigned
part. Header `access-control-expose-headers: set-auth-token` is set.

**Surprise: Origin check.** Node 26's `fetch` sends `Sec-Fetch-*` headers. Better Auth 1.7.15 then forces an origin
check on POSTs even with no cookie: no `Origin` gives **403 `MISSING_OR_NULL_ORIGIN`**, an untrusted `Origin` gives
**403 `INVALID_ORIGIN`**. A CLI or server client must send `Origin: <baseURL or a trustedOrigins entry>` (the baseURL
is trusted by default). Clients that send neither `Origin` nor `Sec-Fetch-*` (curl, `SELF.fetch`) pass.

### 3. Bearer to principal

```ts
// src/worker.ts
const session = await auth.api.getSession({ headers: request.headers })   // bearer() plugin reads Authorization
if (!session) return json({ error: "unauthenticated" }, 401)
return json({ id: session.user.id, email: session.user.email, sessionId: session.session.id })
```

| Request to `/me` | Result |
|---|---|
| `Authorization: Bearer <set-auth-token value>` | 200, `{id:"per_...", email, sessionId:"ses_..."}`, ids match sign-up |
| no header | `getSession` returns `null` (our route turns it into 401) |
| `Bearer garbage.garbage` | `null` (401) |
| signature tampered | `null` (401) |
| **unsigned** token (the JSON body's `token`, no `.signature`) | **200**: bearer accepts a token without a signature |

`getSession` itself never throws for a bad token; it returns `null`, so the 401 is ours to write.
`GET /api/auth/get-session` with the bearer also answers 200.

### 4. Ids

Option in 1.7.15 (`@better-auth/core` `init-options.d.mts`): `advanced.database.generateId`, type
`GenerateIdFn | false | "serial" | "uuid"` where

```ts
type GenerateIdFn = (options: { model: ModelNames; size?: number }) => string | false
```

`model` is the model name (`"user"`, `"session"`, `"account"`, `"verification"`, `"organization"`, `"member"`,
`"invitation"`, `"apikey"`, `"rate-limit"`). (`advanced.generateId` is the old, deprecated place; the invitation route
still reads it.) Ours:

```ts
const prefixes = { user: "per", session: "ses", account: "acc", verification: "ver", organization: "org",
                   member: "mem", invitation: "inv", apikey: "key" }
generateId: ({ model }) => `${prefixes[model] ?? model.slice(0, 3)}_${suffix()}`   // suffix: 16 rejection-sampled base36
```

D1 contents checked by the flow (regex `^<prefix>_[0-9a-z]{16}$` over every row): per_ (68 rows), ses_ (135), acc_ (68),
org_ (3), mem_ (5), inv_ (3), key_ (7), all matched. Samples: `per_0oo4c5des5ukj3kn`,
`ses_05dh32pcrn1myqpy`, `org_e1ro8egf138sg4iy`, `mem_4c8qwryxgyw5e9s5`, `inv_ad2yxk13q1wyrsk5`, `key_02n90w5273wrgax5`.
The verification table stayed empty (no email flows ran), so `ver_` was not exercised.

### 5. Organization (no email configured)

`organization({ requireEmailVerificationOnInvitation: false })` with **no** `sendInvitationEmail`.

- `auth.api.createOrganization({headers: A, body:{name, slug}})` returns `{id:"org_...", members:[{role:"owner"}]}`:
  A is made owner and a `mem_` row is created.
- `createInvitation({headers: A, body:{organizationId, email: B, role:"member"}})` returns `inv_...`. **It works
  without any email being sent**; `sendInvitationEmail` is optional.
- `acceptInvitation({headers: B, body:{invitationId}})` returns the member with `role:"member"`, `userId` = B. Org then
  holds A (owner) and B (member). Accepting by A (the inviter) gives 403 `YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION`;
  accepting twice gives 400 `INVITATION_NOT_FOUND`.

**Two surprises about email verification:**

1. Because we set a custom `generateId`, Better Auth treats invitation ids as guessable and, by default, demands a
   verified email to accept (measured in run 1: 403 `EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION`).
   Setting `requireEmailVerificationOnInvitation: false` lifts it (our ids are 16 random base36 chars, about 82 bits).
2. `listUserInvitations` called with a session **always** demands a verified email, with no option to lift it
   (measured 403 `EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION`). The trusted server-side form works:
   resolve the principal first, then `auth.api.listUserInvitations({ query: { email } })` with no headers. The flow
   does that. Accepting by id needs no list, so a server that hands out the id also works.

### 6. API keys (`@better-auth/api-key`)

```ts
apiKey([
  { configId: "user", references: "user", enableSessionForAPIKeys: true },
  { configId: "org",  references: "organization" }
])
```

- `createApiKey({headers: A-bearer, body:{configId:"user", name}})` returns `{id:"key_...", key:<64 chars>, start,
  referenceId:"per_...", configId:"user"}`. The plaintext `key` is returned only here.
- `createApiKey({body:{userId}})` with **no headers** (trusted server call) works. The same body with the HTTP request's
  (empty-session) headers gives **401 `UNAUTHORIZED_SESSION`**.
- `verifyApiKey({body:{key, configId}})` returns `{valid:true, key:{referenceId: userId,...}}`. A wrong key returns HTTP
  200 (it is a function result, not an error) with `{valid:false, error:{code:"INVALID_API_KEY"}, key:null}`.
- **Org-scoped:** `createApiKey({headers: A, body:{configId:"org", organizationId}})` works for the owner:
  `referenceId` is the org id, `verifyApiKey` returns `valid:true` with that org id. A plain `member` (B) gets 403
  `INSUFFICIENT_API_KEY_PERMISSIONS` (member role has no api-key permission on organizations).
- **`x-api-key` as principal:** with `enableSessionForAPIKeys: true` on the `user` config, `getSession({headers})` with
  `x-api-key: <key>` returns a mock session: `/me` gives 200, `{id: userId, email, sessionId: "key_..."}` (the session id
  is the key id). A bad `x-api-key` makes `getSession` **throw** (403 `INVALID_API_KEY`), unlike a bad bearer, which
  returns `null`. An **org** key sent as `x-api-key` gives 401 `INVALID_API_KEY` from `getSession`: org keys do not
  become a user session, so an org principal needs `verifyApiKey` and our own mapping.

### 7. Timings (local workerd, 30 runs each, client-side wall time over localhost HTTP, M-series Mac)

| Operation | scrypt (default) p50 / p95 | PBKDF2-SHA256 1000 iter p50 / p95 |
|---|---|---|
| sign-up | 59.2 ms / 62.2 ms (second run: 60.2 / 65.7) | 8.1 ms / 10.9 ms |
| sign-in | 58.1 ms / 61.8 ms (second run: 59.1 / 64.9) | 7.7 ms / 9.6 ms |
| getSession via bearer (`/me`) | 6.1 ms / 9.8 ms | 5.8 ms / 8.3 ms |
| getSession via `x-api-key` | 4.5 ms / 7.2 ms | 5.1 ms / 8.0 ms |

The default hasher (scrypt, pure JS from `@noble/hashes`) costs about 50 ms per hash; it is not slow enough to matter
locally. A cheaper hasher is a config option: `emailAndPassword.password: { hash, verify }`. `src/hasher.ts` does
PBKDF2 through WebCrypto (native), selected by `PASSWORD_HASH=pbkdf2` (a `--var`). The whole flow in vitest ran in
about 1.1 s with it. Reading a session is about 6 ms because `auth` (including plugins and the Kysely dialect) is rebuilt
per request; that cost is inside every number above.

### 8. Bundle and `nodejs_compat`

`wrangler deploy --dry-run`: **2219.76 KiB, gzip 374.67 KiB** for the whole worker (better-auth, organization, bearer,
api-key, kysely, zod, jose; no tree-shaking tuning). Within Workers limits (3 MB gzip free, 10 MB paid).
**`nodejs_compat` is required.** Without it the bundle builds with warnings but workerd fails to start:
`No such module "node:crypto"` (from `@better-auth/utils/password.node`) and `node:async_hooks`
(`@better-auth/core/async_hooks`). The wrangler config uses `compatibility_date 2026-08-01` and `["nodejs_compat"]`,
same as the template spike.

### Other measured details

- `rateLimit: { enabled: false }` was set; with the default limits, 30 sign-ups in a loop from one client would be
  throttled. Not measured.
- `database: env.DB` (a raw `D1Database`) works: Better Auth detects it and builds the Kysely D1 dialect itself, with no
  adapter package to install and no transactions.

## The decision it supports

Better Auth is viable as the identity layer for Architect's server target on Cloudflare: people (`per_`),
sessions (`ses_`), organizations (`org_`), members (`mem_`), invitations (`inv_`) and API keys (`key_`) all live in the
project's own D1 with Architect-prefixed ids, and the principal is one function, `auth.api.getSession({ headers })`,
for both `Authorization: Bearer` and `x-api-key`. Shape for the generated server: build `betterAuth` per request from
`env`; map the session to the principal in the entry file; map a thrown `getSession` (bad API key) and a `null` (no or
bad bearer) both to 401; resolve org API keys with `verifyApiKey` and our own principal mapping. For local/test use the
PBKDF2 hasher.

## Open risks

- **Invitation without a verified email.** With `requireEmailVerificationOnInvitation: false`, anyone who signs up with
  the invited address (unverified) and learns the invitation id can accept. The id is the secret. Fine for local and
  for flows where the server hands the id to the right person; production should verify email, or accept only via
  trusted server code.
- **Unsigned bearer tokens are accepted** (the body's `token` without the signature gave 200 on `/me`). The session
  token is itself 32 random chars, so it is not guessable, but the signature gives no extra protection here.
- **Org-scoped API key as a principal needs our own mapping** (not a session); permissions on keys
  (`permissions`) and the org role gate (`member` cannot create org keys) are Better Auth's, not Architect's.
- **Origin check** (403) will hit every Node/CLI client that sends `Sec-Fetch-*` unless it also sends a trusted
  `Origin`; decide `trustedOrigins` and what the CLI sends.
- **Schema comes from a script, not `auth generate`**: `generate` needs a live database. The script path relies on
  `better-auth/db/migration` internals (`getMigrations`); re-check on upgrade. Schema changes between versions need a
  new migration; nothing here tested an upgrade.
- **Cost of rebuilding `betterAuth` per request** is inside the 5-6 ms getSession figure; caching per isolate is not
  possible with `env.DB` captured, except by caching on the binding object. Not measured.
- **Prod CPU for scrypt:** ~50 ms of JS CPU per sign-in/sign-up; a free-plan Worker (10 ms CPU) would not survive it,
  and paid plans bill CPU time. Not run on real Cloudflare (the spike is local only; no cloud was touched).
- `@cloudflare/vitest-pool-workers` is renamed upstream (`@cloudflare/vitest-plugin`); the template spike shares this.
- Email flows (verification, reset, sendInvitationEmail) were not tried; the `verification` table stayed empty.
- Better Auth 1.7.25 is already out (1.7.15 pinned as asked); no upgrade tested.
