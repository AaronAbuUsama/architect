# F1 brief: the blueprint's front end (a 📐 design thread)

Written by the conductor, 16 November 2026, for a thread in any harness (Claude Code, Codex, Pi). Aaron: "audit the
HeroUI Pro features, really understand the blueprint and how everything connects, and propose the DX. This is us
designing the front end for the blueprint."

## Who you are and what you own

You are a 📐 Designer. You write design, Figma frames and throwaway spikes, never package code. Read `AGENTS.md` first
(the rules bind every agent), then `.agents/skills/threads/SKILL.md` (your type, and "Talking to Aaron": he listens
rather than reads, so your reports are short spoken sentences).

The newest design (this brief, D3, O1's amendments, the `src/<thing>` layout) is on `origin/layer/3`, ahead of
`main`: read from there (`git worktree add ../architect-frontend origin/layer/3` or `git show origin/layer/3:<path>`).
Work on a branch `design/frontend` from `origin/main` and add only your own files, so its pull request carries nothing
of stage 3. Spikes go under `spikes/<name>/` with a README (question, tried,
found, the decision it supports, open risks). Your record is `design/decisions/F1-frontend.md`. Land it on `main` by a
pull request, merged when CI is green. Don't touch `layer/*` branches or `packages/`: stage 3 is being built there.

## Read, in this order

1. `design/handoff.md`: where everything stands.
2. `design/docs/index.html`: the design docs and the worked example (acme's allowance), walkthrough steps 1 to 12.
3. `design/decisions.md`, then `design/decisions/` (D1, D2-stage-two, D3, G1, H1, H2, N1, O1).
4. `design/history/spec-drafts.md` section 6 ("The portal") and `design/history/blueprint-context-pack.md` section 1:
   Aaron's original intent: a visual app, not code; HeroUI Pro (licence held); Figma first; Fumadocs or its
   components for docs; a Notion-style editor for prose; two-way (a blueprint change shows in the app, a change asked
   for in the app becomes a blueprint change made by an agent); the HeroUI chat template as the face of a Pi-based
   agent later.
5. The code that is real today: `packages/blueprint/src` (every declaration kind), `packages/compiler` (the model it
   writes, `generated/model/*.json`), `packages/generators` (what is generated), `packages/logbook` (verdicts,
   releases, models per revision), and `examples/acme` (a blueprint plus `src/<thing>/<op>.ts` handlers).
6. `design/build-plan.md`: L2.10 (the portal, stage 3) and what layers 3 to 5 add (kits, chain, time), so the front end
   is shaped for things that don't exist yet.

## The questions to answer

1. **How the blueprint hangs together, drawn.** Things, values, verbs (operations and reads), machines, roles,
   errors, events, journeys, starting worlds, environments, and how evals, verdicts, versions and staleness attach to
   them. One diagram an outsider understands, checked against the compiler's model, not the docs alone.
2. **HeroUI Pro, audited.** What the Pro licence gives at its current version (components, templates, the chat
   template, charts, tables, layouts, theming, Figma kit), read from HeroUI's own docs and the Pro package. Map each
   blueprint view to the components that serve it, and name the gaps. Pin nothing younger than two weeks. Access to the
   Pro package or Figma kit needs Aaron's account: ask him for it, and never print or commit a token.
3. **The DX.** What a person does in the app and what they see, view by view:
   - a project's home: what's proven, where, what's stale and why;
   - a thing's page: its fields, machine (walked through by its events), operations, roles, errors, docs;
   - an operation's page: payload, answer, errors, who may call it, the journeys that use it, its evals and verdicts per
     environment, its traces (O1's `TraceSource`), its budget;
   - journeys, environments and releases (versions from the model diff);
   - later layers: kits, contracts on chain, time moves;
   - the two-way loop: how a change asked for in the app becomes an agent's blueprint change, and how that change comes
     back through prove before it shows as proven.
   Show each as a Figma frame (the Figma MCP is available in Claude Code) or a static mock in a spike, with real acme
   data from its `generated/model`.
4. **The contract between the app and Architect.** The app reads only generated data and the logbook, never project
   source. Propose that data contract (files under `generated/portal/` or a typed API on the logbook), so stage 3's
   L2.10 can build a plain read-only portal on it now and your HeroUI app replaces its face later without a new
   contract. This is the one thing the conductor needs from you soonest: send it as an early, separate report.
5. **Where it lives and how it's generated.** `@architect/portal` is supplied by Architect and generated per project
   (`design/packages.md`). Decide what is generated per project versus shipped as a package, the framework (React
   Router or Next on workerd, Fumadocs for docs), and how it's served locally and in the cloud pass.

## Done when

- `design/decisions/F1-frontend.md` answers the five questions, with the evidence, and grades its options on the
  rubric in `~/.claude/CLAUDE.md` (floor-first, reversibility, blast radius, correctness, parallelizability, fit).
- The data contract (question 4) is its own section, early in the file, with a JSON example from acme's real model.
- Figma frames or spike mocks exist for the home, a thing, an operation, and the two-way loop.
- Build steps are proposed for `design/build-plan.md` (where they land: L2.10, a later layer, or `later.md`), each with
  a done-when check, written in the record, not edited into the plan.
- The questions for Aaron are batched at the end: access, Figma file, and anything only he can decide.
- Nothing is left running.

Report with a short spoken summary for Aaron, then the details for the conductor.
