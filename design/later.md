# Later

Ideas that belong to a later layer, noted here instead of being built. Add one line each: the idea, the layer it
belongs to, and why it waits.

- Indexers beyond the generated follower, for views too large for an organisation's index. Later.
- Safe as a kit, built from its own events and our own small core. Later.
- Python as a third target. Later.
- **Axiom as the sink** (O1 steps L2.O5, L2.O6, L2.O8): deployed workers export straight to Axiom per environment
  dataset, `watch` reads it through an `AxiomSource`. The cloud pass, on Aaron's account and tokens.
- **Noir on Aztec as a target**, client-proved and private (N1, `design/noir/`). After Gate 5, its own layer. The
  private Capxul layers in the handoff are a product roadmap built on it, kept with the Noir thread.
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

- **A durable agent on Architect's own stack** (proposed 16 November 2026, after Aaron pointed at Pi Durable,
  `@earendil-works/pi-durable` in pi-mono). An agent session as a Durable Object: each model turn and each tool call a
  declared step with its span, the transcript committed before anything is shown, waits through `Timers`, resumed by
  the DO alarm after a crash, and the run proven by the same nine evals. Pi Durable's checkpoint-per-phase design is
  the reference, not a dependency (it is about 36k lines and experimental). Belongs with layer five, time.

- **Architect's own CLI as a single executable.** The `single-binary` spike (`spikes/single-binary/`) found what
  stops it: the compiler is spawned through `process.execPath`, three modules read `import.meta` at load, `nx`'s
  native addon is required at load, and the lint plugin and wrangler are resolved as files. Run the compiler
  in-process or through a hidden subcommand, resolve files lazily, ship the plugin beside the binary, and keep `nx`
  off the load path; then the `architect` binary can go through the same tap.

- **Close `/_world/*` outside worlds (D3 #96).** The generated server routes every `/_world/` request to the world on every
  environment, so a deployed environment would answer `/_world/cast` (people with known passwords) and `/_world/facts/*` (rows
  and journal). Gate `cast` to local and test worlds (`ARCHITECT_WORLDS` or no `ARCHITECT_ENVIRONMENT`), and give the staging
  proof another way to read what a step did (the journal from telemetry, a declared read) so facts can close there and on
  production. Needs a `server.ts` generator change after L2.L lands; before the cloud pass deploys anything.
