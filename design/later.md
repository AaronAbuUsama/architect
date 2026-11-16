# Later

Ideas that belong to a later layer, noted here instead of being built. Add one line each: the idea, the layer it
belongs to, and why it waits.

- Indexers beyond the generated follower, for views too large for an organisation's index. Later.
- Safe as a kit, built from its own events and our own small core. Later.
- Python as a third target. Later.
- Each thing as an actor by default. Later.
- The world's front door (`/_world/cast`, `/_world/facts/*`) closed in staging and production worlds: shipping, layer two (stage three), because only then do non-local worlds exist (D2 #28).

## From stage two (layer one)

- An actor's journal entries live in its own Durable Object, so `prove`'s facts door doesn't see them yet. Layer four
  reads them through the actor.
- Idempotency by request for things that `lives: "actor"`: the `_requests` row has to commit inside the actor.
- When a handler awaits a chain call (layer four), the actor holds its lock across the whole call, not only the commit.
- **Key proofs by handler source and journeys too** (D2 #60). Today impact keys a proof by blueprint hashes only.
  When prove gets slow enough that skipping proven operations pays, add the handler file's hash and the hashes of the
  journeys that call the operation.
- **A release-age policy for transitive dependencies.** `minimumReleaseAge: 20160` in `pnpm-workspace.yaml` rejects
  53 entries already in the lockfile (transitives resolved within the last two weeks). The rule binds the versions we
  pin; turning the policy on means rebuilding the lockfile once the window has passed.

- **A durable agent on Architect's own stack, as declared operations** (proposed 16 November 2026; narrowed by H1). The
  build-time harness is Pi Durable behind an Effect seam (`decisions/H1-agent-harness.md`, build-plan track A). What waits:
  the agent run as a declared `Run` thing with a machine (`briefed`, `working`, `checking`, `proven | failed`), its turns and
  tool calls as declared steps, shipped as a std kit `agent` (layer 3, once kits exist); runs resumed by the world's
  `Timers`, stepped-clock tests of agent waits, and scheduled agents (layer 5). The fallback if the Pi seam fails is H1's
  Option E: Effect AI plus `@effect/platform-cloudflare` (`CloudflareWorkflowEngine`, one Durable Object per execution),
  usable from 24 November 2026 under the two-week rule and the `effect` 4.1.3 bump.
- **Agent sandboxes beyond the machine** (H1 section 10): a Docker sandbox over Pi's `pi-env` daemon (build-plan A7), then
  Cloudflare Containers, and Dynamic Workers for an *operator* agent whose tools are the app's operations. Layer 2 and later.
- **Benchmark verdicts in the logbook, and a portal page comparing runs.** Layer 2 once L2.03 and L2.10 exist.
- **Mutant repair tasks** (H2.6 b): break a reference handler mechanically (drop an `emit` or a `move`, swap a declared error), keep
  a mutant only if prove fails on it. Waits until the authored planted breaks (A8) show which evals need more tasks.
- **Benchmark regressions as a gate** (H2.12). Advisory until baselines have shown how noisy they are; a later decision makes it a gate.
- **A weekly scheduled baseline in CI** on free models (H2.12), once CI may hold a model key (Aaron's call, H2 question 3).
- **Other agents as comparison runners** (H1 section 16). Claude Code through the Agent SDK (check 4's runner, parented by `TRACEPARENT`)
  Command Code's own agent (`cmd -p`, headless) and OpenAI's Codex CLI (`codex exec`, on the subscription, H1.13) run the same benchmark tasks behind the same run record, so "our harness against theirs"
  is a measured pair. Layer 2, after A5, once the record exists.
