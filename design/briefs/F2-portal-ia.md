# F2 brief: the portal's information architecture (a 📐 UX thread)

Written by the conductor, 17 November 2026, for a thread in any harness (Claude Code, Codex, Pi). Paste the block below
into a new session started in `~/projects/architect`.

```text
You are a 📐 UX specialist designing the information architecture of Architect's portal: the visual app through which
a person and agents understand a blueprint, see what is proven, and agree on what changes. This is a UX-heavy design
job, not a build job. You write design, mocks and throwaway spikes. You never write package code and never touch
layer/* branches or packages/.

Aaron's ask, in his words: "the information architecture of the portal with respect to the blueprint. What
information do we need to display — the things, the operations, the machines, the events — how does that look, what
information needs to be on each page about each thing. And I want some options." Also: "think about what components
we'd need from Fumadocs, and from HeroUI — tables, data tables, Kanban boards and things like that. We have to really
understand what the blueprint is, what we have, and how best to surface information visually to users."

## First, understand the blueprint (you cannot design its IA without this)

Read, in this order:
1. AGENTS.md (the rules bind you), then .agents/skills/threads/SKILL.md: your type is 📐 Designer, and "Talking to
   Aaron" says he listens rather than reads, so your reports to him are short spoken sentences.
2. design/decisions/F1-frontend.md, all of it. It is the previous front-end design and your starting point: the
   app-to-Architect data contract (section 1), what the app is for and the two loops (section 2), the
   declaration-to-screen map, the HeroUI Pro audit (section 3, with spikes/frontend-dx/heroui-audit.md), and the
   first view-by-view DX (section 4, with the mock at spikes/frontend-dx/index.html). Build on F1. Don't redo it.
   Where you disagree with it, say so with evidence.
3. design/docs/index.html: the design docs and the worked example (acme's allowance, walkthrough steps 1 to 12).
4. The real code, read from origin/layer/3 (it is ahead of main; use `git worktree add ../architect-ia origin/layer/3`):
   - packages/blueprint/src/modules/*: every declaration kind (things, values, operations, machines, events, errors,
     roles, journeys, environments, blanks, visibility, secrets, telemetry, identity, config, cloud, deploy). For
     each kind, list every attribute a declaration can carry.
   - packages/compiler: the model it writes (generated/model/*.json) and what survives into it; compare/service.ts
     for hashes and staleness.
   - packages/logbook: verdicts, releases, models per revision.
   - packages/prove/src/modules: evals, verdicts, trace-trees, sinks, watch (if merged), promote, environments.
   - examples/acme: a real blueprint, src/<thing>/<op>.ts handlers, and generated/ (api, sdk, cli, docs, model).
   - If origin/build/L2.10 or a portal package exists on layer/3, read it: that is the read-only portal floor
     being built now on F1's contract. Your IA must fit that contract or name the contract change it needs.
5. design/build-plan.md layers 3 to 5 (kits, chain, time) and design/decisions/N1-noir-target.md, so the IA leaves
   room for kits, contracts on chain, signers, receipts, clocks, due/actual/lateness and private (visibility) fields.

Write down, before designing anything, an inventory: every declaration kind × every attribute × where it lives
(blueprint source, compiled model, logbook, telemetry, or not projected yet). This inventory is the IA's raw
material and goes in the record.

## The questions to answer

1. **Who uses the portal and for what.** Name the audiences (Aaron as product owner, a developer writing a handler, an
   agent taking a task, a reviewer judging a change, an operator watching production) and their top jobs, ranked.
   Each page you design must say which jobs it serves.
2. **The page types and what is on each.** For each declaration kind that earns a page (at least thing, operation,
   read, machine, event, error, role, value, journey, starting world, environment, release), give its content
   inventory, ranked must, should and later: what it shows, in what order, which relationships it links to, and
   where each fact comes from (the inventory above). Kinds that do not earn a page say where they appear instead.
   Cover every state honestly: blank (declared but incomplete), unproven, proven per environment, stale (and why),
   refusal versus defect, private fields (visibility), and not-projected-yet. No invented data.
3. **The options.** At least three genuinely different IA models, for example:
   - object-centric (a wiki/catalog of things, each the hub for its operations, machine and events);
   - lifecycle-centric (organised around the two loops: design ideate→spike→specify, build
     implement→check→prove→promote→watch);
   - graph-centric (a navigable map of declarations and their dependencies, with pages as zoom levels);
   - work-centric (milestones, tasks and boards derived from the blueprint, with declarations as the context).
   For each: the sitemap, the primary navigation, how a person gets from "what is acme?" to "why is spend stale in
   staging?" in clicks, and what it is bad at. Grade them on the rubric in ~/.claude/CLAUDE.md (floor-first,
   reversibility, blast radius, correctness, parallelizability, fit with F1 and L2.10), then recommend one, or a
   hybrid with a stated primary axis.
4. **Components, section by section.** For each page type in the recommended IA, map every section to a concrete
   component and say why it is the right shape for that information:
   - Fumadocs (read its docs at the current version, primary source): Cards, Tabs, Accordion, Steps, TypeTable and
     AutoTypeTable, Callout, Files, code blocks, Mermaid or diagrams, TOC, breadcrumbs, the sidebar and search. Say
     what docs pages Fumadocs generates from the blueprint and how they sit beside the app pages.
   - HeroUI OSS and Pro (F1's audit lists the Pro archives; read the real components): DataGrid and tables, tabs,
     timeline, charts, chips and status, the app layout, code and Markdown views, chat primitives, the rich-text
     editor, and any Kanban or board pattern (check whether Pro or its templates have one; if not, name the gap and
     the OSS option).
   - Domain views that no library gives and Architect must own: the machine diagram (states, moves, events), the
     environment × eval verdict matrix, the staleness explainer, payload/answer type views, the trace tree, the
     journey step-through, the model-diff/version view. Sketch each.
   Name the gaps. Pin nothing younger than two weeks. Don't copy HeroUI Pro source or commit its archives; F1's
   distribution decision stands.
5. **Navigation and cross-linking.** The global navigation, the environment switcher (global or per page), search
   (what is indexed), breadcrumbs, and the link rules: every operation links to its thing, machine move, events,
   errors, roles, journeys and evidence; every event links back to the move that emits it; and so on. Draw this as
   a link map.
6. **Learn from good products.** Look at how strong developer and ops products surface similar information, from
   their own docs and screenshots: for example Stripe's API reference, Backstage's software catalog, Temporal's
   workflow UI, Inngest, Encore's dev dashboard, Linear and Mintlify. For each, take one concrete pattern worth
   borrowing and one to avoid, with a link.

## Done when

- `design/decisions/F2-portal-ia.md` answers the six questions, with the inventory first, the options graded on the
  rubric, and a recommendation. Every claim about the blueprint cites a file:line on origin/layer/3.
- Visual mocks exist in `spikes/portal-ia/` (static HTML, openable with no server) for the recommended IA: home,
  thing (allowance), operation (allowance.spend), machine, event, environment, and one board or work view. Plus one
  sitemap per option. All names, fields and relationships come from acme's real generated model; anything
  illustrative is labelled as such on screen.
- A component table: page type × section × component (Fumadocs, HeroUI OSS, HeroUI Pro or Architect-owned) ×
  data source.
- Any change the IA needs in F1's data contract is written as a concrete JSON diff against F1 section 1's example,
  so L2.10's portal can grow into it without a new contract.
- Proposed build steps (where each lands: a later layer or later.md), each with a done-when check, written in the
  record, not edited into build-plan.md.
- Questions for Aaron are batched at the end in the batch-grill format from ~/.claude/CLAUDE.md, each with real
  code or data, a visual of the options, and a recommendation. Only ask what he alone can decide.
- Work on a branch `design/portal-ia` from origin/main, adding only your own files (the record, spikes/portal-ia/).
  Land it on main by a pull request, merged when CI is green. Nothing left running.

Report to Aaron in a few short spoken sentences: the recommended IA, what each main page shows, the biggest gap,
and the link to the mocks. Then give the details for the conductor.
```
