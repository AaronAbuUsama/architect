# Where Orthograph stands

Snapshot of 19 November 2026, 09:51 UTC, written by the conductor before a pause in Claude usage (back about 11:40
UTC). The board's data in `data/` is from the same minute. If the live board (<https://claude.ai/artifact/4UH7mYegtpWM9rq4f1ZAJw>)
is newer, it wins.

## Read these first

- `AGENTS.md`: who decides, how work flows, the code's rules, Aaron's standing rules.
- `design/handoff.md`: the conductor's handoff, with every line of work and its done-when.
- `design/milestones.md`: M0 to M7, every slice. `design/decisions/K13-lock-down-first.md`: today's re-cut.
- `design/ledger.md`: every known issue with its owning slice (summary at the end of this file).

## The direction (Aaron, 19 November, K13)

Lock down what exists before anything new. Run the generator, build a blueprint, see it in the portal, and check that
every output (SDK, CLI, MCP, portal, telemetry) carries things, fields, events, errors and steps properly. One example
all the way through: a links app (a link-in-bio page), dogfooded. Approvals, actions, the agent's chat and what an
agent may do are **off the critical path** (moved to M3, ids kept).

## The critical path to Gate M1, then M2 (workable)

1. **In flight:**
   - M1.35: one rule for what each caller sees, plus issued secrets. Critical.
   - M1.36: telemetry carries the model.
   - M1.38: the confirmation depth per chain.
   - M1.33 and M1.34: merged on `m1`, CI pending.
   - The canon's minimal pass (X-canon).
2. **M1.40**: `examples/links`, declarations and empty handlers. It waits on the canon thread's links blueprint.
3. **M1.41**: the loop through the real `ortho` binary, every output read for the basics. Checks first, written by a different agent.
4. **M1.43** (links' handlers) and **M1.42** (the basics in every output). M1.12, the SDK contract, merges after M1.35.
5. **M1.13**: the portal as a viewer. M1.39 is the canon's chain page.
6. **Gate M1 (M1.15)**, then the npm preview (X-npm).
7. **M2**: principals and roles, every kind of caller, the identity plugin, organisations, `ortho new`, and **Gate M2: workable**.

`meta.json` (`critical.steps`) holds the same path with every task id.

## Threads now

| Thread | Session | Branch / PR | State |
|---|---|---|---|
| 🎛 Conductor | `local_b6ebc731…` | `conductor/k13-lock-down` (#69), `conductor/board-skill` | Merging #69 once CI is green (🔍 review passed); this skill's PR next |
| 🧭 M1 lead | `local_90551e2a-cfc9-414b-b00b-7934d33b56fd` | `m1` at `6419d4b7`; PR #64 | Builders on M1.35, M1.36, M1.38; M1.12 built on `m1-12-clients` (`cddd3e15`), merges after M1.35; the M1.38 builder waits on its evidence captures |
| 📖 Canon, minimal pass | `local_bb023976-b3f5-4d53-8bfb-9ef8d4b6883d` | `canon-minimal` | Rewriting the canon around the links app for a package user; owes the M1 lead the links blueprint for M1.40 |
| 📒 Ledger | `local_52beae9e…` | `claude/ledger-k7-k9`, #58 | Idle; #58 in review |
| 🤖 Codex links (run by Aaron) | none | `links/stage-1`, #56 | Idle; `codex/links-staging` deploys to real staging with **no teardown step** |
| 📐 Portal designer | `local_24ad5b8b…` | #66 merged | Done |

## Waiting on Aaron

- Rotate the HeroUI token (X-heroui).
- Entity or actor: did "clusters" mean Effect Cluster's entity in place of the actor? (question on X-canon)
- The licence for every published package (portal-ui's builder chose MIT; the repo has none), and the npm publish after Gate M1 (X-npm).
- Release credentials, each in writing (M7-13), and the staging token's scope (M7-01).

## Good work off the critical path (for a parallel agent)

None of this touches `m1` or `canon-minimal`. Each item ends in its own branch and PR from `main`.

- **#56's teardown.** Write the step that destroys what `codex/links-staging` deploys, so nothing is left running (X-pr56). Stay under the $10 a day cap.
- **The ledger's stale names.** Rows still use the names retired by K6 (FOR-01, FOR-02, CMD-01, KIT-01 and others). `design/naming.md` maps every name.
- **X-jou13 and X-unowned.** Pick an owning slice for each, and record the call in `design/decisions/`.
- **The M2 to M7 decision questions** on `M2-01`, `M3-01`, `M4-01`, `M5-01`, `M6-01` and `M7-01`. Draft their answers as decision records, grounded in the code. Don't build them.
- **Rules for any of it:** follow `AGENTS.md`. No Docker. Pin versions exactly, at least three days old. Never print or commit a key. A builder never edits journeys or evals. Update the board as the skill says.

## The open issues ledger
325 of 724 ledger items are open; 37 are marked high. The high ones, each with its owning slice:

| Item | Owner | The issue (first sentence) |
|---|---|---|
| `FOR-01` | M1.14 | "Behaviour is the only freehand code" has an exception: an adapter's mapping blank is also hand-written, and M1.14 doesn't say whether it is a handler. |
| `FOR-02` | M1.11, M2.05 | The project config file (`ortho.config.ts` after K6) still holds the project's name and sign-in choice and the compiler does not read it; both are meant to move into mounts, and the package map still says it also holds telemetry, which no longer lives there. |
| `BLU-02` | M1.03 | Journeys live in two places: prove reads both `blueprint/journeys/` and the root `journeys/`, acme keeps its journeys at the root, while `ortho add journey` and the canon use `blueprint/journeys/`. |
| `BLU-04` | M1.03 | The model leaves out journeys, starting worlds and role rules, so agents and projections cannot see them; the frame's "where today falls short" list repeats this with several other gaps that have their own slices. |
| `LAH-01` | later | Noir on Aztec is parked in milestones' `Later` with no slice, while N1, `later.md` and the private-membership example still say it comes "after Gate 5", which no longer exists; its private-core spike is merged but framework work is "later". |
| `LAH-03` | later | The addendum still says "Revoke is instant and private" and "nobody outside can see anything"; spike 3 refutes both as stated, and generated docs and client guarantees must not promise them. |
| `LAH-45` | M6.01, after K7 | For our own contracts, how a declared operation maps to what runs on chain, and which contract functions clients may reach, is undecided. |
| `PLU-01` | M1.06, M1.14, M5.03 | Plugins and mounts, adapters and calls out as steps, `Blueprint.kit`-style provenance, namespaces, collision checks, impact edges and wrappers are not built anywhere, and nothing calls out to another system or receives a webhook. |
| `PLU-02` | M1.01 | The plugin descriptor decisions are still open: choices against settings, `Blueprint.need(x, { when })`, runtime entries per host, and how aliases, error-class names and schema-affecting choices behave. |
| `PRJ-44` | M1.12, M6.01, M6.15 | The SDK has no contract for its caller, retries or refusals: a method takes only a payload. |
| `ROL-02` | M2.07 | Two role models disagreed (`holds` and the code's rule); decided: the rule is the model, and the organizations plugin's `holds` is a shortcut that produces a rule. |
| `HAN-01` | M1.17 | Every handler is offered a raw `SqlClient`, so a handler can write to the database outside the commit that guards a store. |
| `JOU-01` | M1.03 | Journeys are not in the model yet, so the generated app cannot show proof status live, its `<Scenario>` block was not built, and the spike server reads journey files as a stopgap. |
| `JOU-02` | M2.08 | Journeys call the server over raw HTTP, so the SDK, CLI and MCP are never proved by a journey; the replay rule (the same evidence through each projection) is designed but not built. |
| `PRF-01` | M1.04 | A verdict is keyed only by the blueprint's hash, not by the handler code or journeys it judged, and the logbook keeps one pass or fail per run rather than one per operation per journey, so an unchanged contract does not prove the same implementation ran. |
| `PRF-05` | later (design/milestones.md:298) | Time (one clock per world, moves made by time, the keeper, the on-time eval, agent waits on the world clock) is parked in the milestones' Later list, so the keeper has no owner and journeys cannot step a month until it lands. |
| `PRF-61` | M1.26 | Eval 6 requires every declared step on an answered call, in declared order, so a handler that takes a branch skipping a step on success fails it. |
| `TRA-01` | later (design/later.md:10-11) | Deployed workers exporting straight to Axiom per environment, and Axiom datasets, monitors and dashboards made from declarations, are filed as the cloud pass, though the Axiom sink and `AxiomSource` already work and were checked live; no M7 slice names the deployed part. |
| `STA-01` | M6.06 | The chain example says Anvil runs as a child process locally and in a container in CI, but the spike proved the container path locally on Docker; a child-process Anvil is a separate adapter nobody has decided to build. |
| `STO-03` | M1.17 | Stores are specified but not built: a thing's home is still the closed `database` or `actor`, an environment binds one database, and there is no `blueprint/stores/`, no declared stores, no typed `stores:` bindings and no stores owned by a plugin. |
| `STO-04` | M1.17 | What does a field's visibility mean in each store kind? Today it is only a comment, so a private field on a thing that lives on a chain is either refused by the compiler or silently public, and nothing decides which. |
| `STO-05` | M1.17 | Where does a store kind's schema come from? The store port only reads and commits; the generator hard-codes the schema for D1 alone (every field `TEXT NOT NULL`), and an actor keeps the whole instance as one JSON value, so an open kind has to say how fields become storage and how that storage migrates. |
| `VIE-01` | M5.05 | A list over things that live as actors is refused today; views kept from events (M5.05) are the way to list them, and may change F5's reason for keeping missions and runs as database rows. |
| `SEC-02` | M2.04 | Today environment files name secrets by string and no handler can read one; secrets are meant to be declared by the plugin that needs them and read only as `Redacted` through its layer. |
| `WOR-01` | M3.03 | Effect's Cloudflare Workflow engine is experimental and its replay after eviction (do finished activities get skipped?) is unproved; it is adopted behind a seam, with a hand-written Durable Object workflow as the fallback. |
| `WOR-02` | M3.01 | M3.01 must decide the workflow shape (steps, `step.await` on an event, durable clocks), where it lives, and the Effect and platform-cloudflare pins. |
| `WOR-03` | M5.10 | One owner per call: cross-actor and cross-store work is to run as a workflow rather than one call, and apps cannot declare workflows until M5.10. |
| `ENV-01` | M7.01, M7.04 | Everything runs locally and no cloud destination is built; the real Cloudflare, npm, Homebrew, Axiom and real staging sign-in are the cloud pass (M7). |
| `ENV-02` | M7.03 | The Alchemy stack (the infra projection) is not built: `generated/infra` holds only wrangler configs, Alchemy 2 `deploy` and `destroy` always need a Cloudflare account, and the `cloudflare` destination says it is not built. |
| `AUT-01` | M2.03 | Principals in code are only `anonymous` or `person`; the `agent`, `service` and `system` principals are not built, so nothing can say an agent is spending for a person (the work app uses `owner.of("mission")` as a stand-in). |
| `AUT-02` | M2.06 | The page behind `/device` (where a person approves a device code) and the OAuth consent page are unbuilt; D3 gave them to the portal, which F6 replaces with the generated app, and no slice names them, though K1 lists them as the auth plugin's own pages. |
| `AGE-01` | M4.01 | The H1 second pass (the Durable Object host is Cloudflare's `PiHarness` from `agents` 0.33.0, skill tools named `activate_skill` and `read_skill_resource`, GenAI span names, sharper facts) sits only on the unmerged branch `claude/design-agent-harness-e6e8ff`; PR #9 was closed unmerged and no record says whether its edits to build-plan A3 to A6 were taken. |
| `AGE-02` | M4.01 | Where a run lives is contradictory: H1 makes the Run thing `lives: actor`, F5 says runs and missions are database rows because lists need a database while each run's loop is its own Durable Object; M4.01 must settle it. |
| `FAC-01` | M3.09 | M3.09 names four task kinds (`write:journey`, `build`, `fix`, `improve`), but the factory's own example lists more (specify, machine, validate, prove, promote) and F4 had its own seven; the canon must say which kinds exist. |
| `FAC-02` | M3.14 (parked) | The portal's Work side (board, progress, burn-down, KPIs, the manager's conversation) is still a mock in `spikes/portal-fumadocs`; M3.14 still says "portal" although F6 replaces the portal with one generated app. |
| `KIT-01` | M3.12 (parked) | The agent kit's package is `@orthograph/agent-kit` (M0-build, packages.md), but `generators.md` still mounts the kit from `@orthograph/agents`; PR #37 corrects it and is unmerged. |
| `CMD-01` | M1.16 | The design says `ortho prove --unbuilt` but the slice builds `ortho prove --empty`; the two names disagree. |

The full list, with evidence and status, is `design/ledger.md`; the rest are unmarked or lower severity.
