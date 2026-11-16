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
