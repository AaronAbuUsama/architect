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
  private Capxul layers in the handoff are a product roadmap built on it, kept with the Noir thread. **Moved into
  v1.0** as stage 4 of the growing example (K9, ST4.01 to ST4.08).
- Each thing as an actor by default. Later.
- ~~The world's front door closed in staging and production worlds~~: done in L2.08 (D3 #126, #127).
- **Editing the blueprint from its graphs** (`spikes/react-flow-graphs`, 19 November 2026). Dragging a new move
  between two states, or a new state onto a machine, would write the blueprint file: add the move to the thing's
  `machine.moves` with its `from`, `to` and `emits`, scaffold the operation that makes it, and regenerate. The graph
  stays a view of the file, never a second source. It waits because the portal is read-only until the editor exists,
  and because an editor needs elk in the browser (a worker), where `Graph` today gets positions from the generator.
- **A machine's `from` kept as a tuple** (K16, #76 commit 27f64555, ledger `MAC-08`). A machine move's `from` reaches the
  handler types as an array, so `CreatedId` reads every machine move as "may mint" and types `context.id` as an id even
  on a move from a state, where it is `undefined` at runtime (`prehandle.ts` mints only from `[]`). Keeping `from` a
  tuple through `Blueprint.machine` restores the exact type. It waits because the runtime is right and nothing reads
  that `id` today; a type test pinning a non-creating machine move's `id` to `undefined` comes with it.
- **Invariants beyond `unique`** ([G5](decisions/G5-invariants.md) §7), each with a decision step before the slice that
  first needs it:
  - `Blueprint.invariant.requires`, a rule across things: Plugged In's `LinkNeedsHandle` and work's four `Mission*`
    refusals. It waits on two questions: a key that comes from the caller (`link.add` carries no owner), and whether
    the rule holds only when a record is made or always, in which case releasing a handle must refuse or cascade.
  - A bound on one record (`taken + people ≤ places`): `SheetFull`, `AllowanceExceeded`, `SoldOut`. It waits because
    those refusals carry a computed `left`, which a declared bound would have to produce.
  - An early refusal before the handler, for a creating move whose payload carries the key; field-level `writes` on
    database steps, so an operation that can break a rule is known exactly; `ortho add invariant`.
  - Caseless keys belong in the value (K9's `names.lowercase` choice), never in a key function no index can hold.

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
- **Agent sandboxes beyond the machine** (H1 section 10): E2B (K10 section 3; the Docker sandbox over `pi-env`, A7, is dropped with
  Docker, K10 section 8), then Cloudflare Containers, and Dynamic Workers for an *operator* agent whose tools are the app's operations. Layer 2 and later.
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

## From the factory (K10)

- **A `cloudflare` sandbox choice** for `@orthograph/workspaces`, beside `localCopy` and `e2b`, if E2B falls short. Not spiked.
- **A person's feedback on a run** (HeroUI Pro's Rating and Emoji Reaction Button on a run's answer) as input to the bench (H2). Waits until the bench reports exist (M4.14).
- **Experiments shared between projects**: a kept experiment's plugin published for another app to mount. Waits on plugins published from their own CI (M2.10).
- **`@orthograph/portal-ui` on open libraries** (F7): the same exports on free HeroUI 3 primitives, Recharts, TanStack
  Table, cmdk, Shiki, react-markdown, Tiptap and dnd-kit, the shell by hand. Waits until the HeroUI Pro licence lapses
  or its terms stop a framework importing it.

## From the grid (#154)

- **A list read's item samples.** When a list read lands (the model has no list marker today, and neither example has one), the MCP output-schema eval builds each
  item's sample from the declared fields, or reports the item unjudged. Items rebuilt from telemetry lack the untraced public fields and would be a false red.

## From prove's coverage (the eval 8 line, G3)

- **A "reachable from a journey" flag on the model's refusals.** Prove's coverage line leaves out the runtime refusals no journey can cause by name:
  every refusal coded under the runtime's prefix (`AR`) except `NotAllowed` (`packages/prove/src/modules/evals/internal/run.ts`, `unreachable`). That is
  inferred, so the next runtime refusal is classed by its prefix, right or wrong. When one arrives, the model should say per refusal whether a journey can
  cause it, and prove should read that. Waits on the next runtime refusal (121 to 125 are held for them, G3).
## From the grid (error.portal, #168)

- **`error.portal` can't see whether the portal really has a metrics source.** A page that always shows the `not-yet` marker
  (`data-hole="metrics"`) and never writes a count passes, even when refused spans exist, because the grid has no metrics source at
  M1.13 and the marker is not tied to a surface. When the portal gets a source in the grid, the eval must check the marker against
  the source (a marker with a source is wrong), and require the marker to sit on, or be visible next to, the refusal surface it
  excuses. Waits on a metrics source in the grid's portal data (M1.13's metrics reader, M7.14 for history).
