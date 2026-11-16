# D2, continued: stage two (Gate 1)

Decided 16 November 2026 by the builder, which has architectural ownership. The evidence is in
`design/wayfinding/stage-2.md`. Numbering continues from `D2.md`.

35. **A call commits once.** During one attempt at a call, a handler's reads go to the store, while its writes
    (`records.insert`, `records.update`) are held back. Once the handler has answered and the answer is checked, the
    wrapper adds the move (the subject's new state) and its journal entry. Everything is then committed in one go,
    through the host's `Store.commit`. On D1 that commit is one `batch`.
    - **Why:** D1 has no transactions in Workers, and a batch is the only atomic unit it has.
    - **The cost:** a write step's span measures the handler's own work, not the store's write. The write happens
      at the commit, inside the operation's span.
36. **Every thing has a version, and each update is guarded by the version it read.** On D1 the guard is
    `version = CASE WHEN version = <read> THEN version + 1 ELSE NULL END` on a `NOT NULL` column. A stale guard
    raises, so the whole batch rolls back, and the commit answers `conflict`.
    - On a conflict the wrapper runs the whole attempt again: role check, machine check, handler. It tries at most
      64 times, then dies naming the contention.
    - Nothing waits between attempts. Every round, at least one contender wins.
37. **The machine's own refusal is checked by the runtime, before the handler.**
    - If the subject exists and its state isn't one the move starts from, the call is refused with
      `<Thing>Not<FirstState>` carrying `{ state }`. For example, a revoked allowance refuses a spend with
      `AllowanceNotActive { state: "revoked" }`.
    - A missing subject is the handler's to refuse, unless a role check has already refused it (item 45).
    - The generated code passes the refusal's name to `Handlers.serve`, because names come from paths.
    - The version read here is the one the commit guards, so the check still holds when the move lands.
38. **`lives: "actor"` is a Durable Object per instance that owns that instance's row and its journal.**
    - It commits through the same `Store.commit`, inside `transactionSync` under a one-permit `Semaphore`, with the
      same version guard.
    - In layer one, a call's writes go to one owner only, so a commit never spans owners.
    - From layer four, when a handler awaits a chain call, the actor holds its lock across the whole call instead
      (`design/later.md`).
39. **The race test lives in `host-cloudflare`, not `target-effect`.** It needs workerd, D1 and Durable Objects for
    real. It runs 50 concurrent spends against both owners. `target-effect`'s own test covers the retry over the
    in-memory store.
40. **Sign-in is Better Auth 1.7.15 on D1** (email and password, `bearer`, `organization`, and
    `@better-auth/api-key`). Test people sign up for real through the running Worker.
    - The signed test tokens from stage one stay, but only behind the world's door, until the starter (L1.50) moves
      acme onto Better Auth.
    - The OIDC issuer for a later staging sign-in is Dex in Docker.
41. **Check 4 of Gate 1 is a real `claude -p` session.**
    - It runs in a copy of acme with the journeys removed, as well as denied in its `--settings`. It's given only
      `architect brief allowance.spend` and must make `prove` pass.
    - It runs wherever Claude Code is signed in. In GitHub CI it needs an `ANTHROPIC_API_KEY` secret, which is a
      credential, so in CI it runs only when that secret exists, and otherwise prints that it was skipped and why.
      The cloud pass sets the secret.
42. **The lint rules are an oxlint JS plugin in `packages/lint`** (`architect/*`).
    - `no-name-as-string` gets the declared names through a config that `architect check` generates. Rules have no
      type information, so `undeclared error` is caught by `tsc`, not by lint.
43. **A read is answered by the runtime, with no handler.** `Blueprint.read` compiles to an operation of
    `kind: "read"`, served by `Reads.serve`. Who may read is checked on the instance itself. A missing id is refused
    `NotAllowed`, the same as an instance the caller may not see, so a read never tells an outsider what exists.
44. **Idempotency is the `idempotency-key` header, kept in `_requests`.** The key is
    `<operation>|<person>|<key>`. The answer is committed under it in the same commit as the call's writes. A second
    call with the same key finds it and answers it again, marking its span `request.replayed: true`. Two concurrent
    calls with one key collide on the `_requests` primary key; the loser's commit is a conflict, and its retry replays
    the winner's answer.
    - In layer one an operation on a thing that `lives: "actor"` is not idempotent by request (`design/later.md`).
45. **`AllowanceNotFound` is gone from `allowance.spend`.** Only the grantee may spend, and the role check reads the
    allowance first, so a missing one is refused `NotAllowed` before the handler runs. The error could never be
    reached, and coverage said so. This corrects item 37's example: a missing subject behind a role is the role
    check's refusal, not the handler's. The class stays in `errors.ts` for operations without such a role.
46. **A bare role in `allowed` is judged on the operation's own subject**, and a `role-of` path starts from a payload
    field, or from the subject when the payload has no such field. `Access.check` takes the operation's thing.
47. **Evals judge a move by the state stored right after its call**, recorded on the call, not by the state at the
    end of the run, which later calls may have moved on. A replayed call made no move, so machine path, events and
    steps don't expect one from it.
48. **Journeys are type-checked with the project.** `refuses` takes `NotAllowed`, and `run` takes any declared read.
    Expected values may name the script (`toBe(s.olga.person)`); `prove` resolves them before comparing.
49. **A refusal carries the log that decided it.** Each attempt runs the handler with one more logger beside the
    project's, which remembers the last message. When the handler refuses, the operation's span gets
    `refusal.log` as well as `refusal`. A refusal with no log before it carries none, and explainability names it.
50. **The handler's error type is checked by `tsc`, and the gap it leaves is closed by lint.** The generated `Handler`
    type narrows the error channel to the declared classes, and the author's fixture (spend failing with
    `AllowanceLimitTooHigh`) fails to compile. Declared errors are structural, though, so an undeclared error with
    the same fields as a declared one (two with no fields, say) would compile. L1.40's lint plugin closes it with a
    rule: a handler file constructs only the errors its operation declares, read from the generated config.
51. **Steps are judged in the order they are declared.** Each step's span is marked `step.kind` (`database` or
    `wait`). The steps eval reads each span's start from the collector and fails a call whose declared steps ran out of
    order. Equal starts pass: workerd's clock only moves across I/O, so two steps with no I/O between them can share one.
52. **Coverage is the eighth eval of every operation**, so each prints `9 evals ✔` with its p50, p95 and budget, as
    the docs show. An operation fails coverage when no journey calls it, makes its move, reaches each outcome or gives
    each declared error. One line then counts the whole run: `moves 3/3 · outcomes 3/3 · refusals 2/2 · runtime
    refusals 4/7`. The plan's `outcomes 2/2 · refusals 4/4` predated revoke's own outcome and item 45; outcomes are
    the states moves end in (active, exhausted, revoked), refusals the declared errors, and runtime refusals
    (`NotAllowed`, `AllowanceNotActive`) are counted but never required.
53. **A blank is a value the declaration functions accept, and the compiler records.** `Blueprint.todo` returns a
    frozen `{ kind: "blank", what }` typed as anything. `machine`, `operation` and `read` skip what they can't build
    from a blank (moves checked against states, schemas from fields). The compiler lists blanks by declaration in
    `model.blanks`, describes a blank thing part as empty, and leaves an operation with any blank out of `operations`,
    so nothing is generated for it until it is filled (the generators' side of L1.31). `architect check` finds blanks
    by text, so it gives each one's file and line. `architect add` writes journeys to `blueprint/journeys/`, the docs'
    place; `prove` reads both that and the root `journeys/` (item 24).
54. **`architect generate` is `nx sync` for one project, from the architect command.** It runs the same render through
    an Nx `FsTree` and says what changed: generated files, and a scaffold for each operation with no blanks left,
    marked "yours from now on". A scaffold is never overwritten, and a second run says `nothing to change`. `cli`
    depends on `generators` for this; both are build-time tools, never in production.
55. **Generated docs are Markdown, one page per thing and per operation**, opening with an HTML comment that says they
    are generated. An operation's page has who may call, payload, answer, move, steps, every refusal with its exit
    code and when it happens, and how to call it from the CLI, HTTP and the SDK. `generated/model/edges.json` lists
    what depends on what: field references, operations on their things, moves on their events, roles that allow them.
    The generated CLI takes `--json` on every command. It signs in with `<PROJECT>_TOKEN` until the starter's Better
    Auth sign-in (L1.50); it doesn't send an idempotency key yet, which the SDK gains with that sign-in work.
56. **A brief is for one handler, and names its journeys by the files that import the operation.** `architect brief`
    reads the model and the journey files' text: a journey that imports `verbs/spend.ts` calls spend. Reads and
    unknown names are refused, listing the operations that have handlers. The forbidden paths (`Brief.forbidden`) are
    the ones Gate 1's `claude -p` session is denied.
57. **`architect check` compares `generated/` itself rather than calling `nx sync:check`.** The build plan said drift
    runs through `nx sync:check`; it runs the same render (`Render.files`) and compares file by file instead, so the
    finding names the exact file and works in a project copy that isn't an Nx project. Any difference, missing file or
    extra file is the rule `no-edited-output`. The repository's own CI keeps `nx sync:check` as well. Evidence:
    `check.test.ts`, the `edited-output` fixture.
58. **`no-raw-sleep` is part of `no-wall-clock`.** I2 named a separate rule; one rule now covers every way of reading or
    waiting on real time outside the runtime: `Date.now`, `new Date()`, `setTimeout`, `setInterval` and a raw
    `Effect.sleep`. Evidence: `packages/lint/src/modules/rules/rules.test.ts`.
59. **The architect rules run as their own oxlint config, with the project's facts passed as rule options.** check
    writes `.architect/check/oxlintrc.json` (ignored by git) with only the architect rules, and names each file,
    because oxlint skips anything under a `.gitignore`d folder when walking one, even with `--no-ignore`. The project's
    own lint config stays its own.
60. **A proof rests on the operation, its thing, and the things it reaches.** `Compare.dependsOn` keys each proven
    operation by its own hash, its thing's, every thing its payload, answer or thing's fields refer to, and every thing
    whose role may call it. prove writes them to `.architect/evidence/proven.json` with the model it proved;
    `architect impact` reads it. A new operation is `unproven`, never `stale`: stale means a proof that no longer
    holds. Journeys and handler code are not in the key yet: a handler change is caught by running prove, which is
    cheap locally; keying by handler source waits until prove is slow enough to need it (`later.md`). Evidence:
    `packages/prove/src/modules/impact/impact.test.ts`.
61. **Better Auth is identity only; organizations, memberships and invitations are the project's own things.** It keeps
    people (`per_`), sessions (`ses_`), accounts and API keys (`key_` ids, keys starting `ak_`), with
    `advanced.database.generateId` giving Architect ids. Its organization plugin isn't used: a project's organization
    has its own machine, roles and journeys like any thing, and one store holds it. Every Better Auth table is
    `auth_*`, so the starter's `session` thing can't collide with Better Auth's session table. Evidence:
    `spikes/better-auth-workerd/`, `host-cloudflare/src/modules/auth/auth.test.ts`.
62. **Handlers reach identity through the runtime's `Auth` service** (`signUp`, `signIn`, `createApiKey`, refusing
    with `AuthRefused { reason }`); the host provides it, and `Principals` resolves a bearer session token or an
    `ak_` key to `{ kind: "person", person, email }`. A handler never imports Better Auth. The generated `Handler` type's
    default requirements now include `Auth`.
63. **Better Auth's tables are created by the host on first use**, from a schema checked in at
    `host-cloudflare/src/modules/auth/internal/schema.ts` and compiled from the options with Kysely's `DummyDriver`
    (`auth generate` needs a live database). A test fails when the schema is stale. Better Auth checks its tables the
    moment it is constructed, so the instance is made only after they exist.
64. **Every local world signs its cast up for real** (D2 #40 done). The world's test tokens are gone. A cast member
    whose role is `Blueprint.anyone` is not signed up: they get an email and a password, so a journey can sign them
    up itself. Cast members carry `email` and `password` refs in scripts, and the principal carries the email, which
    the `invitee` role reads. The world's secret is now Better Auth's `AUTH_SECRET`, fresh per world.
65. **An event's fields come from its subject as the call left it, then the payload, then the answer.** The starter's
    `OrganizationCreated` carries `owner`, which only the instance has.
66. **The starter is a real project in the repository, `examples/starter/`,** proven on every CI run like acme. The
    preset ships it. Its journeys and fixtures are the journey author's.
67. **Published packages ship compiled JavaScript; the monorepo keeps running from source.** Node refuses to strip
    types under `node_modules` and Nx can't load a `.ts` generator from there (`spikes/preset-verdaccio/`). Each
    package builds to `dist/` with tsc 7 (`rewriteRelativeImportExtensions`), and `publishConfig` points `exports`,
    `imports` and `bin` at `dist/`. Installs from the local Verdaccio go only through `npm_config_registry` and
    `pnpm_config_registry`.
68. **`kysely` is held at 0.29.7 by a workspace override.** Better Auth would resolve 0.29.9, published 12 November
    2026, inside the two-week window. One copy also keeps Better Auth's plugin types whole.
69. **The preset writes the starter without compiling anything.** `@architect/preset` copies `examples/starter`'s
    blueprint, handlers and journeys (packed under `files/` when published) and renders `generated/` from the
    starter's own `generated/model/model.json` under the new name, so nothing runs before the new workspace's packages
    are installed. Its package.json pins every `@architect/*` package at the preset's own version.
70. **Sync, like drift, leaves dot-folders under `generated/` alone.** `.wrangler/` there belongs to a running or
    finished local world, not to the blueprint; deleting it made `nx sync:check` fail after any local prove.
