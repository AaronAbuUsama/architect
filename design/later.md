# Later

Ideas that belong to a later layer, noted here instead of being built. Add one line each: the idea, the layer it
belongs to, and why it waits.

- Indexers beyond the generated follower, for views too large for an organisation's index. Later.
- Safe as a kit, built from its own events and our own small core. Later.
- Python as a third target. Later.
- **PostHog as a sink** (O1 L2.O8, L2.O9): error tracking for defects and a `PostHogSource`. Aaron, 16 November 2026: leave it for now; the `Sink` seam keeps it one adapter away.
- **Axiom as the sink** (O1 steps L2.O5, L2.O6, L2.O8): deployed workers export straight to Axiom per environment
  dataset, `watch` reads it through an `AxiomSource`. The cloud pass, on Aaron's account and tokens.
- **Noir on Aztec as a target**, client-proved and private (N1, `design/noir/`). After Gate 5, its own layer. The
  private Capxul layers in the handoff are a product roadmap built on it, kept with the Noir thread.
- Each thing as an actor by default. Later.
- ~~The world's front door closed in staging and production worlds~~: done in L2.08 (D3 #126, #127).

## From stage two (layer one)

- An actor's journal entries live in its own Durable Object, so `prove`'s facts door doesn't see them yet. Layer four
  reads them through the actor.
- Idempotency by request for things that `lives: "entity"`: the `_requests` row has to commit inside the entity.
- When a handler awaits a chain call (layer four), the actor holds its lock across the whole call, not only the commit.
- **Key proofs by handler source and journeys too** (D2 #60). Today impact keys a proof by blueprint hashes only.
  When prove gets slow enough that skipping proven operations pays, add the handler file's hash and the hashes of the
  journeys that call the operation.
- **A release-age policy for transitive dependencies.** `minimumReleaseAge: 20160` in `pnpm-workspace.yaml` rejects
  53 entries already in the lockfile (transitives resolved within the last two weeks). The rule binds the versions we
  pin; turning the policy on means rebuilding the lockfile once the window has passed.

- **A durable agent on Orthograph's own stack** (proposed 16 November 2026, after Aaron pointed at Pi Durable,
  `@earendil-works/pi-durable` in pi-mono). An agent session as a Durable Object: each model turn and each tool call a
  declared step with its span, the transcript committed before anything is shown, waits through `Timers`, resumed by
  the DO alarm after a crash, and the run proven by the same nine evals. Pi Durable's checkpoint-per-phase design is
  the reference, not a dependency (it is about 36k lines and experimental). Belongs with layer five, time.

- **Orthograph's own CLI as a single executable.** The `single-binary` spike (`spikes/single-binary/`) found what
  stops it: the compiler is spawned through `process.execPath`, three modules read `import.meta` at load, `nx`'s
  native addon is required at load, and the lint plugin and wrangler are resolved as files. Run the compiler
  in-process or through a hidden subcommand, resolve files lazily, ship the plugin beside the binary, and keep `nx`
  off the load path; then the `ortho` binary can go through the same tap.
- **A durable agent on Orthograph's own stack, as declared operations** (proposed 16 November 2026; narrowed by H1). The
  build-time harness is Pi Durable behind an Effect seam (`decisions/H1-agent-harness.md`, build-plan track A). What waits:
  the agent run as a declared `Run` thing with a machine (`briefed`, `working`, `checking`, `proven | failed`), its turns and
  tool calls as declared steps, shipped as a std kit `agent` (layer 3, once kits exist); runs resumed by the world's
  `Timers`, stepped-clock tests of agent waits, and scheduled agents (layer 5). The fallback if the Pi seam fails is H1's
  Option E: Effect AI plus `@effect/platform-cloudflare` (`CloudflareWorkflowEngine`, one Durable Object per execution),
  usable now under the three-day rule (R1), with the `effect` 4.1.3 bump.
- **Agent sandboxes beyond the machine** (H1 section 10): a Docker sandbox over Pi's `pi-env` daemon (build-plan A7), then
  Cloudflare Containers, and Dynamic Workers for an *operator* agent whose tools are the app's operations. Layer 2 and later.
- **Benchmark verdicts in the logbook, and a portal page comparing runs.** Layer 2 once L2.03 and L2.10 exist.
- **Mutant repair tasks** (H2.6 b): break a reference handler mechanically (drop an `emit` or a `move`, swap a declared error), keep
  a mutant only if prove fails on it. Waits until the authored planted breaks (A8) show which evals need more tasks.
- **Benchmark regressions as a gate** (H2.12). Advisory until baselines have shown how noisy they are; a later decision makes it a gate.
- **A weekly scheduled baseline in CI** on free models (H2.12), once CI may hold a model key (Aaron's call, H2 question 3).

- **The cloud pass must set `ORTHO_ENVIRONMENT` on every deployed Worker, and give `Facts` a D1-API reader (D3 #126, #127).** The front door is closed unless
  the environment is named and declares a lifetime; a Worker that forgets the name reads as a local world. Staging's proof reads D1 through a file today.
- **Name the SDK and CLI packages from the mounts (D3 #112).** The generators name the CLI from the project's folder and `publish` names
  `@<folder>/sdk` and `@<folder>/cli`. The config's unread `outputs` was removed in M0; the projections' mounts (M1.11 to M1.13) are where
  these names are chosen.
- **The SDK without Orthograph's server packages.** `@acme/sdk`'s declarations and runtime import only `effect` and `orthograph`
  (and its `/server` entry for the API's schemas); a consumer of the SDK still installs all of `orthograph`. Splitting the client's
  schemas from the blueprint's declaration API would slim it; worth doing before the packages are public (the cloud pass).
- **Orthograph's own CLI as a single executable** (spike `single-binary`, D3 #9): still blocked by the four breakages the spike lists
  (`import.meta` at load, spawning `process.execPath` as Node, the lint plugin and wrangler as files, nx's native addon). The generated project
  CLI ships as a binary; `ortho` stays an npm package.
- **Atomic OAuth client-registration ceiling before public deployment (D3 #195).** The local count-before-insert guard
  is a throttle; concurrent registrations can exceed the nominal500 threshold. Keep role/JWT admission unchanged,
  but enforce a strict ceiling at its authoritative mutation before a public cloud rollout. No such rollout is in goal01.

- **Legacy host adapter policy debt (D3 #197).** Before extending the existing publish, world-process or host
  telemetry adapters, and before public cloud use, remove their remaining literal throw/try and ambient-env policy
  violations and close the corresponding workspace lint coverage gap. Local Gate2 records this limitation; it
  does not grant new runtime exceptions or claim every standing-rule syntax restriction was certified.
- **Entities on `@effect/cluster` (K8).** Today an entity is a Durable Object behind a service shaped like an Effect
  Cluster `Entity`. Running entities on `@effect/cluster` itself, off Cloudflare, is a host of its own, after M7.
