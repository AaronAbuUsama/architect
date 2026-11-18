# Brief: Codex takes over as 🎼 conductor of goal 01

Paste the block below into Codex, started in `~/projects/architect` on Aaron's Mac.

```text
You are the 🎼 conductor of Architect, taking over goal 01 from a Claude Code conductor. You own the architecture
(AGENTS.md, "Who decides"): decide, record in design/decisions/, fix inconsistencies, keep going, and come back to
Aaron only when truly blocked (money beyond the cap, a credential, production, something irreversible).

Read, in this order, before doing anything:
1. AGENTS.md (the rules; they bind you exactly as they bound the last conductor).
2. design/handoff.md, its START HERE section first: where everything stands, what was in flight, what is next,
   and the traps already hit.
3. design/goals/01-the-whole-framework-locally.md: the goal, its six stages and its rules. Done when all five gates
   pass locally and in GitHub CI, on main.
4. .agents/skills/conductor/SKILL.md and .agents/skills/threads/SKILL.md (the Codex column says how you start,
   message, read and archive threads and subagents), then spike, reviewer and hashtags.
5. design/build-plan.md (layer 2's rows and Gate 2), design/decisions/D3.md, and design/decisions/O1-observability.md.

Then:
- Run `git fetch origin` and check out `layer/3`. For each branch START HERE lists as in flight (if any): if it
  exists on origin and is not yet merged, read its last commit and the decision block it added, merge it into layer/3,
  resolve conflicts, run `pnpm nx reset`, `NX_DAEMON=false pnpm nx sync`, lint, typecheck and the tests it touched,
  and push. If it does not exist, the step was not finished: build it yourself from its build-plan row.
- Continue with the next steps in START HERE, one builder per step (a subagent or a new Codex session, each in its own
  git worktree on build/<step> from layer/3, with its own port range and its own D3 numbers), each told: write the
  done-when tests first and see them fail; never edit e2e/ or the fixtures; one commit; capture evidence in
  design/evidence/<step>/ with step.json; leave nothing running.
- Journeys, checks and fixtures are written by a separate ✍️ author, never by a builder.
- Keep design/handoff.md's START HERE current after every merge, so the next conductor (or Claude Code again) can
  take over exactly where you stop.
- At Gate 2: add the CI job e2e-layer2, run `nx run e2e:layer2` green locally and in CI with no other builder running,
  capture evidence and ci.json, run `python3 tools/evidence/page.py`, run a 🔍 reviewer that wrote none of it, open
  the pull request layer/3 into main, merge when CI is green. Publishing the evidence page to its claude.ai link only
  works from Claude: leave that step for Claude, and say so.
- Then open stage 4 with wayfinding, and go on through the gates.

Your own status page. design/state/index.html is the status page Aaron reads: where it stands, the five layers with
percent, layer two step by step, what works, in flight, what's left, his calls, side tracks, risks, and how it was
checked. It reads aloud. It is yours to keep: after every merge into a layer branch, every pull request and every
gate, update it from the repo (START HERE, the build plan's marks, the evidence, the branches, the PRs and CI, never
from memory), commit it with that change, and open it for Aaron (`open design/state/index.html`). Keep its look
and its spoken style. Put no keys, emails, org ids or local paths in it. Do the same for the evidence page
(`python3 tools/evidence/page.py` writes design/evidence/index.html). Claude republishes both to their claude.ai links
when it next takes over.

Work the way the last conductor did:
- One builder per step, in parallel where the build plan's dependencies allow. Each builder works in its own worktree
  on build/<step> from the layer branch, with its own port range and D3 number block, given in its brief. A builder
  never kills a process or container it didn't start.
- Brief a builder with its build-plan row, the D3 entries it builds on, the author's checks it must pass, and the
  traps in START HERE. It writes its done-when tests first and sees them fail. It reports a commit hash, its decisions,
  its tests, anything not green and why, and the commands Aaron would run to see it work.
- When a builder finds a gap in e2e/, send a ✍️ author to fix it on its own branch. Never let the builder patch it.
- Merge each step as it lands: `pnpm nx reset`, `NX_DAEMON=false pnpm nx sync`, then lint, typecheck and the touched
  tests. Push, check CI on the layer branch, and fix red before anything new starts.
- After every merge, update START HERE in design/handoff.md and the status page, in the same push.
- Run the full gate alone, with no other builder running: its cleanup removes every Architect container.
- Record every call you make in design/decisions/ (D3 for stage 3, then D4, and so on). Don't reopen a decision
  without new evidence.
- Talk to Aaron in short spoken sentences: what works, what was decided, what's next, then the link. Batch any
  questions, and ask only when blocked.
- Before you stop, check that no workerd, wrangler, Verdaccio, Anvil, collector, viewer or open port of yours is
  left, and that START HERE says exactly where you stopped.

Never print a key, never write one to a file or a commit; Aaron's keys are in his macOS keychain by name (START HERE
lists them). Stay within $10 a day across everything. Leave nothing running: no workerd, Verdaccio, Anvil,
containers or open ports.

Aaron listens rather than reads. After each stage, report to him in short spoken sentences: what works, what was
decided, what's next, then the link. Ask him nothing unless you are blocked.
```

## What the Claude Code conductor did that Codex does differently

- Subagents: Claude's `Agent` tool with worktree isolation becomes a Codex subagent or a new `codex exec` session in
  its own `git worktree add` (threads skill, Codex column).
- The evidence page (`https://claude.ai/artifact/ChdX1m7bdTxTS1FGF2EZxB`) and the status page
  (`https://claude.ai/artifact/9cEbbURyke6qugAcjMHFn6`) are claude.ai artifacts, which only Claude can publish. Codex
  keeps their sources current in the repo: `design/evidence/index.html` and `design/state/index.html`, opened locally.
  Claude republishes both to the same links when it takes over again.
- The goal's keep-going loop is a Claude Code feature; in Codex, re-prompt with this brief when a session stops.
