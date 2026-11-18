# Goal 3: M1, the plugin path

## The prompt

> You are the 🧭 lead for M1's plugin path in Orthograph, in this repository. Run it as one autonomous goal until every
> slice below is on `m1`, green with its own check, or until you are truly blocked as `AGENTS.md` defines it.
>
> Read first: `AGENTS.md`; `design/milestones.md` ("How a milestone works" and the whole M1 section, word for word);
> `design/frame/mounting.md` and `design/frame/projections.md`; `design/decisions/K5-the-whole-shape.md`;
> `design/handoff.md`; the ledger rows owned by M1.01 to M1.10; Codex's `layer/4:design/decisions/D4.md` and
> `layer/4:e2e/layer3/`; the `threads`, `conductor` and `reviewer` skills in `.agents/skills/`.
>
> - **Branch:** `m1`, cut from `main` at `32e0281`; one commit per slice, each ending green with its "done when" check;
>   each slice ticked in `milestones.md` with its proof in the commit that lands it; `m1` pushed after every slice.
> - **Separate agents:** ✍️ authors write the checks and journeys, and they fail on `main` for the right reason before
>   any build slice they judge starts; 🔨 builders or the lead write the code and never edit a check, a journey, the
>   evals or the runner's generic checks; a 🔍 reviewer that wrote none of it passes the branch.
> - **Landing:** M1 reaches `main` only as one pull request at Gate M1. This goal opens no `m1` → `main` pull request.
>
> Don't do M1.03, M1.04, M1.11 onward, M1.17 to M1.26, or M1.27: other threads and later goals take them.

## The bound

Plugins mount, with one file and one command. A fixture feature is mounted in a fresh copy of the starter by
`ortho add feature`, its operations appear in the model under their names from paths, the generated SDK, HTTP and MCP
answer from the plugin's own handler, collisions and unmet needs are refused by name, and the uses graph is whole.

- **Local only.** No cloud, no keys, no registry beyond the local Verdaccio. Every world, stage and container made is
  destroyed. Ports 19260 to 19279 for `e2e/m1` (another session may hold 8880).
- **Not in this goal:** adapters' calls out (M1.14, though checks `03` and `04` are ported now and stay red), the
  complete model (M1.03), verdict keys (M1.04), projections as plugins (M1.11 to M1.13), stores (M1.17), traces
  (M1.18 to M1.20), the port from agent-native (M1.22 to M1.24), the portal (M1.25), the wired scaffold (M1.26),
  `runs: "client"` (M1.27), and K7 F1's manifest.

## The rules that shape the slices

1. **The decision first.** M1.01 harvests D4 sections 1 to 3 under the frame's words and pins the public surface the
   checks judge: [`../decisions/M1-plugins.md`](../decisions/M1-plugins.md). Checks are written against it, never
   against guessed private APIs.
2. **Checks from another agent.** M1.02's author ports Codex's `00` to `06` to `e2e/m1` in the new words, adds `07`
   (descriptors, M1.05) and `08` (verbs, M1.07), and shows each failing on `main` for the right reason.
3. **The model is unchanged without mounts.** A project with no mounts keeps its model and its `generated/` byte for
   byte, so Gates 1, 2 and M0 stay the net.
4. **Fold in K5 and leave K7 open.** Plugin operations are an app's operations, so `emits:`, optional steps, stores and
   the SDK contract reach them unchanged. Runtime behaviour is one module per operation per host, open to F1.

## The slices

| id | what | done when |
|---|---|---|
| M1.01 | the plugin descriptor decision | `decisions/M1-plugins.md` written |
| M1.02 | Codex's checks `00` to `06` ported to `e2e/m1`, plus `07` and `08` | they run and fail for the right reason on `main` |
| M1.05 | the descriptors in `orthograph` | a fixture feature, adapter and projection type-check; a wrong field fails to compile (check `07`) |
| M1.06 | mounts: the compiler reads the three folders and folds each feature into the model | check `01`'s mounts by hand pass |
| M1.07 | the verbs: choose, include, narrow, omit | a fixture narrowed and with one operation omitted generates without it (check `08`) |
| M1.08 | needs and collisions | checks `05` and `06` pass |
| M1.09 | runtime entries per host and import closures (taken if it fits) | check `02` passes |
| M1.10 | `ortho add feature\|adapter\|projection`, pinned exactly under R1 | check `01` passes through one command |

## The loop, for every slice

1. Run the slice's check first and watch it fail for the right reason.
2. Build, run, read the failure, fix. Repeat until it passes and every earlier check still passes
   (`pnpm nx run-many -t check test`, and the gates the slice could touch).
3. Tick the slice in `milestones.md` with its proof, update the ledger rows it closes, commit, push `m1`.
4. Stop everything started: no workerd, wrangler, Verdaccio or port is left running.

## Evidence

Each slice's "done when" run is captured with `tools/evidence/capture.sh M1.<nn> <name> <exit> -- <command>` under
`design/evidence/M1.<nn>/`, never retyped.

## The demo

Written when M1.10 lands: a fresh copy of `examples/starter`, one `ortho add feature` of the fixture feature, then
`ortho check` and `ortho prove` green.

## Reporting

To the conductor, at the end of every turn, in a `TO THE CONDUCTOR` block: what landed on `m1`, what Aaron can now run,
and what is left before Gate M1. Questions for Aaron are batched in the grill format, only when truly blocked.
