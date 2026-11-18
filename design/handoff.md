# Where everything stands

Kept by the conductor after every merge, decision, new thread or archive, so a fresh or compacted session continues
exactly where the last one stopped. The narrative of goal 1 (layers 1 and 2) is in
[`history/handoff-layers-1-2.md`](history/handoff-layers-1-2.md).

## START HERE (18 November 2026)

### The goal

Forman is **workable at the end of M2**: plugins mounted and proved, auth and organizations as plugins, the new
principals, secrets by declaration ([`milestones.md`](milestones.md)). Then Aaron builds Capxul's plugins on it,
refining Forman as he goes. Everything below is judged by whether it gets us there sooner and truer.

### The direction (Aaron, 17 and 18 November)

1. **Docs first.** Before M1 is built, the docs canon says what each concept is. The canon is the spec the code is
   built to. **M1 is held** until canon pass 1 and the generated app's design are agreed.
2. **Everything falls out of the blueprint.** The description is verbose because agents write it; the payoff is that
   docs, the app, live observability and the agent kit are generated, never hand-configured.
3. **Spine and our own agent-native template.** Forman is the spine and owns all the truth: blueprint, model,
   Worker, stores, proof, telemetry. **What `generate` produces is our own agent-native template, with agent-native
   used as it is:** its UI, chat, actions and auth, and no HeroUI (Aaron, 18 November: "if we're keeping agent
   native, there's no point in keeping hero UI … it should be its own template, but we do need to know what the
   template is in the first place"). **Nothing more is built until the template is defined:** its information
   architecture, every kind of page, how generated, written and live content sit together, what `generate` writes
   versus the template's own code, where state lives, how live data gets in, and how the chat sees the screen.
4. **Content is the central context area**: people's and agents' own notes, plans, research and conversations, plus
   the generated pages, which are mostly derived from the code with some prose people write.
5. **Analytics is for building and measuring the system**: events flowing through, errors, refusals, each operation
   against its budget. Funnels come later. Dispatch and the factory come later (M3, M4).
6. **Skills are core; agents are not.** Any agent uses the same skills.

### How the pieces relate

```text
                       goal: workable at end of M2
                                   ▲
   M1 the complete model and plugins  ──►  M2 auth and organizations
     ▲  held until ①②③ agree                ▲
     │                                        │ the generated app replaces the docs and
 📒 ledger ──► ① docs canon ── defines each concept ─┤ portal projections (M1.13) and is the
     │  its <Model> blocks are ③'s pages     │ face over M3 factory and M4 agents
 ② skills design ── the agent kit (S8) ── used inside ③
 ③ generated app (spine + our own agent-native template)
     ▲ reads ④ (live data path)  ▲ uses ⑤ (animations)
 ④ portal-observability spike (done)   ⑤ visuals spike (done)
 decided and merged: K2 frame · K3 stores and sources · O2 trace gaps · M0 rename
```

### The threads, each with its definition of done

| # | Thread | PR | Done when | What it feeds | State |
|---|---|---|---|---|---|
| 📒 | Open-issues ledger | — | `design/ledger.md` on `main`: every open, deferred or promised item from `design/`, the Aztec and Noir work, the layer records, code TODOs and PR reviews, each sourced and mapped to a canon page and a slice; unowned items first; a stale-vocabulary sweep with counts | ① pass 2; new slices for unowned items | **working** |
| ① | Docs canon in MDX | #38 | **Pass 1:** Aaron agrees the outline, the template and the `stores` and `traces` pages. **Pass 2:** written in layers, in dependency order (Aaron, 18 November: "let's start with layers … and then we build up"), checking with the ledger before each layer; every page in the outline; the canon check passes on `main` | M1's contracts; the generated app's Content pages | **writing layer 1**: forman, blueprint, things, machines, operations, handlers. `stores` is a draft with three gaps (schema per kind, visibility per kind, whether a chain is a store), settled by a decision round before layer 3 |
| ② | Skills and workflows for Blueprint (K4) | #37 | Aaron answers its four questions; K4 updated with the answers and merged | the agent kit (S8, S11, S12); what agents do in ③; M3 and M4 | **waits on Aaron's four answers** |
| ③ | Generated app (our agent-native template) | #41 | **Pass 1:** the template defined in PR #41's body on real acme data: IA, every page kind, generated vs written vs live, what `generate` writes, state, live data, chat; what is taken from, changed in or left out of agent-native's Content, Analytics, Plans and Chat. Aaron agrees. **Pass 2:** on acme, locally, generated from the model: one action per operation; derived pages for things, operations, machines, events, errors and environments; live spans, events and errors; chat answers "why did spend refuse ada?" from the screen and the trace | proves "falls out for free"; becomes the app projection in M1 | **defining the template, no build** |
| ④ | Portal observability spike | #39 | Merged for the record | ③'s data path: a page is a pure function of `model.json` plus a telemetry window, read from the Collector's files | done, merge for the record |
| ⑤ | Animated visuals and the `visuals` skill | #34 | Aaron approves the look; merged | ① and ③'s animations | **waits on Aaron's look** |
| — | work-real spike | #28 | Merged for the record before M3 | M3, the factory | parked |

### What waits on Aaron

1. Review the canon's layer 1, PR #38, when its thread asks.
2. Answer the skills design's four questions, PR #37.
3. Look at the animations, PR #34.
4. The template's definition, PR #41, when its thread asks.

### Next on the critical path

When ① pass 1 and ③ pass 1 are agreed: start M1 with M1.01 (the plugin descriptor decision), folding in what the
canon and the generated app settled. The new slices M1.17 to M1.20 (stores, the commit span, untraced text, call
counts) run in parallel. The M1 harvest also takes `layer/4` and the two `author/stage4-*` branches; the local
`master` is retired after it.

### Open questions carried by threads

- The Collector without Docker: a native `otelcol-contrib`, or OTLP straight into the shell (③ decides for the
  prototype).
- Pinning agent-native: 0.228.2 (13 November) is the newest version old enough under R1.
- What the ledger finds that nothing owns: each becomes a slice or a canon question.
- Journeys aren't in the model yet (M1.03), so proof status can't be shown live.

## Done

- **M0, land and rename:** merged in PR #32. Forman, `forman`, `@formants/*`, `language-*`, the lint rule against old
  names, the docs as one page. Evidence in [`evidence/M0.02/`](evidence/M0.02/) to [`evidence/M0.06/`](evidence/M0.06/).
- **K3 and O2:** merged in PR #36. Stores of open kinds, sources through adapters; the three trace gaps with their
  slices.
- **Branch triage:** merged in PR #33. The portal-docs spike kept as its own line; idle worktrees and merged branches
  removed.

**Traps carried over from goal 1** (full list in the old handoff): run `pnpm nx reset` then
`NX_DAEMON=false pnpm nx sync` after any generator change; Gate 2's teardown removes every new container with the
framework's prefix, so don't run two gates at once; a killed Gate 2 run can leave its registry container behind.
