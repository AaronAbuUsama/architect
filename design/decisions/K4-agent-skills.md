# K4: skills are core, and how agents use them

Decided 18 November 2026 by the building agent, under "Who decides" in `AGENTS.md`, for the design in
[`../frame/skills.md`](../frame/skills.md). Aaron's view, which every call below serves: skills are core, because they
codify ideating, building, testing and everything else; agents are not core, and any agent should be able to use the
skills (Claude Code, Pi, or our own agents later). The four calls that are his are in
[`../frame/skills-questions.md`](../frame/skills-questions.md), not here.

## Decided

1. **Skills, roles and agents are three things.** A skill is how to do one job. A role is a bundle of skills, a tool
   set and the paths it may write. An agent is what runs. A person in any agent can use a skill with no role at all.
2. **The kit ships in `@formants/agent-kit` and never depends on `@formants/agents`.** `packages.md` already named
   `@formants/agent-kit` (M3) as the agents projection's package, but `frame/generators.md` section 3 mounted the kit
   from `@formants/agents`, the M4 feature that runs agents. That would have made skills wait for agents and tied them
   to our harness. Fixed in `generators.md` in the same change.
3. **Skills name actions, never one agent's tools.** One generated table in `generated/agents/RULES.md` maps each
   action to each form's tool, the way the `threads` skill holds one table for this repository's agents.
4. **Every action has a `forman` command.** That is the floor: a skill works in any agent with a shell, before
   `forman mcp` and code mode exist (M4.11). Code mode is the cheaper path where it is present.
5. **Templates have slots and gated sections.** A gate names a capability (`commit-span`, `metrics`, `code-mode`,
   `stores`, `factory`); a shut gate renders the floor and says what can't yet be told. One template serves a project
   before and after each slice lands.
6. **Every skill has an eval that fails with H2's `null` runner and passes with its `oracle`,** the same rule as
   journeys failing on empty handlers. A skill without both doesn't ship. Evals run in `@formants/agent-kit`'s CI, not in
   each project; projects run the drift check.
7. **The scorer is never a skill.** Judging is code (H2.7, CI). Only `write-a-journey`'s eval uses a judgement, and it
   is advice, never a gate.
8. **`frame/skills.md` owns the catalogue.** `generators.md` section 3's skill table is replaced by a link, and its
   names are mapped there (`read-telemetry` became the four watch skills, `prove-and-promote` became two,
   `turn-drift-into-tasks` became `turn-a-finding-into-a-task`).
9. **Counting comes from metrics, reading from spans.** `bp.telemetry.counts` reads `forman.calls` through a new
   `MetricSource` beside `TraceSource`; `refusals` counts from it and samples a trace only when a span opened; `calls`
   keeps its meaning (calls that opened a span). Without this, a watch skill can't see the refusals O2 gap 3 is about.
   `frame/builder.md` section 2's sketch is updated to match.
10. **Skill names are identifiers.** `generated/agents/skills.ts` exports them, so `Blueprint.agent({ skills: [...] })`
    takes no strings (`AGENTS.md`: a declared name is never written as a string outside `generated/`).
    `frame/examples/agents.md` is updated.

## Evidence

- `design/packages.md:40` names `@formants/agent-kit` for the projection; `design/milestones.md:161` (M3.12) builds it
  before `@formants/agents` (M4.10).
- The trace gaps the watch skills depend on: `packages/language-effect/src/modules/handler/service.ts:46` (role check),
  `:71` (commit, no span), `:83` (the operation's span opens), `:104-105` (`InvalidPayload`); no `Metric` in
  `packages/*/src`.
- The versioner can't see a loosening: `packages/compiler/src/modules/compare/internal/versions.ts:11` makes only
  payload, answer, errors and refusals breaking, so a widened role or a raised budget is a patch (Q2 of the round).

## Left open

- `frame/builder.md` still says `blueprint mcp` in places; the command is `forman mcp`. Left for the docs pass, which
  is under way in another session.
