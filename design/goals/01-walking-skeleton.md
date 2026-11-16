# Goal 1: the walking skeleton, on this Mac

## The prompt

> Read `AGENTS.md`, then this file, then `design/decisions.md`, `design/build-plan.md` (layer one) and
> `design/packages.md`. You own the architecture: decide, record, keep going. Build the walking skeleton below on
> branch `layer/1`, one commit per step, looping generate, run, fix until each step's check passes. Stop only when the
> done check at the bottom passes from a clean clone, or when you are blocked as `AGENTS.md` defines it.

## The bound

One operation, `allowance.grant`, goes the whole way, locally, with no cloud: a declaration in
`examples/acme/blueprint/`, the compiler's model, generated api, server, sdk and cli, served on Miniflare, called from
the generated CLI, and proven by a journey with two evals.

**In:** L1.01, the decision records D1 and D2, then L1.10 to L1.15.

**Out, for goal 2:** machines and moves (L1.20 on), the D1 race spike (S3), the lint rules (S6), Better Auth (the
skeleton uses `anyone` and test principals), docs output, scaffolds, `check`, the preset, and anything in the cloud.

## Calls already made for this goal (record them as D1 and D2)

1. **Spikes S2, S4 and S5 are folded into the build.** The skeleton is S2 done for real. L1.15 answers S4. L1.13
   answers S5. A throwaway spike happens only when a step is stuck (see the loop).
2. **D1:** `lives` takes `database | actor | chain` in the language; only `database` is built here, plus the world
   Durable Object. The local host is Miniflare, through `wrangler dev` and `@cloudflare/vitest-pool-workers`, behind a
   `Host` service. Storage is D1 (Aaron's call). Effect is the current stable major, pinned exactly; if its SQL layer has
   no D1 driver at that version, wrap the D1 binding directly.
3. **D2:** the build plan's four recommendations stand (`to` lists, `Blueprint.read`, `idempotent: "request"`, starting
   worlds run operations). Only the names rule matters inside this bound.
4. **Journeys come first, from another agent.** Before L1.15, a subagent that has not written the handler writes the
   skeleton's journey and two planted bad fixtures (a wrong answer shape, an undeclared error). The builder never edits
   them.

## The loop, for every step

1. Write the step's "done when" check as a test or script first, and watch it fail.
2. Build, run, read the failure, fix. Repeat.
3. When it's green and every earlier check still passes, mark the step done in `build-plan.md` with its proof, and
   commit.
4. **Stuck rule:** after three different failed approaches on one problem, open `spikes/<name>/`, answer the question
   in throwaway code, write its README, record the decision, and go back to the step.
5. **Disagreements:** if building shows the design is wrong or inconsistent, fix the design in the same commit and add
   a record to `design/decisions/`.
6. Stop everything you start: no dev server, Miniflare or port is left running at the end of a step.

## Done check

From a fresh clone of `layer/1`, all of these pass, scripted as `pnpm nx run e2e:skeleton` except the first line:

1. `pnpm install --frozen-lockfile && pnpm nx run-many -t lint,typecheck,test` is green, and a fixture where
   `blueprint` imports `compiler` fails lint with `@nx/enforce-module-boundaries`.
2. `architect model --json` on acme matches its snapshot. Renaming `verbs/grant.ts` to `award.ts` renames the
   operation. Reformatting a file leaves the hash unchanged.
3. `nx sync` writes `generated/{api,server,sdk,cli}`, and `nx sync:check` passes, then fails after a hand edit to
   `generated/sdk`.
4. `architect dev` boots on Miniflare with the world Durable Object. Then `acme allowance grant --to olga --limit 500`
   prints an allowance id, and the route answers 200 to `curl`.
5. `architect prove --env local` prints `allowance.grant 2 evals ✔`. Each planted fixture makes it exit 1, naming the
   call.
6. The `allowance.grant` span carries its payload's attributes, and nothing reads the wall clock.
7. CI on GitHub is green for `layer/1`. Nothing is left running on the machine.

Then update `design/handoff.md`, and report to Aaron for the ear: what works, what was decided, and what goal 2 is.
