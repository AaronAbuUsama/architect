# Goal 2: M0, land and rename

## The prompt

> You are the builder for milestone M0 of Forman (formerly Architect), in this repository. Run it as one autonomous
> goal until Gate M0 passes on `main`, or until you are truly blocked as `AGENTS.md` defines it.
>
> Read first: `AGENTS.md`, `design/milestones.md` (the "How a milestone works" rules and the M0 section, word for
> word), `design/decisions/K2-forman-frame.md`, `design/frame/README.md` and `design/frame/story.md`,
> `design/handoff.md`, and the `conductor` and `reviewer` skills in `.agents/skills/`.
>
> - **Branch:** `m0`, cut from `main`; one commit per slice, each ending green with its "done when" check.
> - **Ownership:** where code and design disagree, decide, fix the other in the same change, and record it in
>   `design/decisions/`.
> - **Separate agents:** a checks author writes the gate's name check; a 🔍 reviewer that wrote none of it passes the
>   branch before it merges.
> - **The handoff:** keep `design/handoff.md` current after every commit; tick each slice in `design/milestones.md`
>   with its proof in the commit that lands it.
> - **Landing:** one pull request for `m0`, merged by the builder when CI is green on a head that includes current
>   `main`, the gate passes on a clean checkout, and the 🔍 review passed. No auto-merge.
>
> Don't touch the `layer/*` branches and don't start M1.

## The bound

M0 only: one name and one vocabulary, with nothing broken. The framework's packages, command, folders, variables, lint
and design docs say Forman; Gates 1 and 2 still pass under the new names; a name check keeps the old ones out.

- **No cloud, no keys.** Everything runs locally, as in goal 1 ("local, never fake"). The npm org `@formants` is not
  created; M0 publishes only to the local Verdaccio.
- **Not in this goal:** plugins and mounts (M1), anything from Codex's `layer/4` (harvested in M1), renaming the GitHub
  repository (Aaron's call).

## The rules that shape the slices

1. **Mechanical first.** M0.02 and M0.03 are renames only: no behaviour, assertion or budget changes. The old gates are
   the net (milestones, risk 1).
2. **Records keep their words.** Decisions, evidence, briefs, wayfinding, spikes and the layer 1 and 2 build plan say
   what happened in the words used then (`decisions/M0-packages.md` section 5).
3. **Checks from another agent.** The gate's name check is written by a checks author and fails on `main` before the
   rename lands.
4. **Gates run everywhere.** `nx run e2e:m0` is green on a clean checkout locally and in GitHub Actions.

## The slices

| id | what | done when |
|---|---|---|
| M0.01 | the package map (decision) | `decisions/M0-packages.md` written |
| M0.02 | packages and imports renamed; `target-*` becomes `language-*`; Nx tags follow | `nx run-many -t check test` green; `rg '@architect/'` finds nothing outside the records |
| M0.03 | the command, folders and variables; `outputs` removed from the config | `nx run e2e:layer1` and `e2e:layer2` pass, renamed |
| M0.04 | a lint rule against the old names | it fails on a planted `@architect/` import |
| M0.05 | design docs rewritten around plugins, the story as the spine | the docs build, their link check passes, "kit" appears only in history |
| M0.06 | Gate M0 | `nx run e2e:m0` passes on `main` |

## The loop, for every slice

1. Run the slice's "done when" check first and watch it fail.
2. Rename, run, read the failure, fix. Repeat until it passes and every earlier check still passes.
3. Tick the slice in `milestones.md` with its proof, update `handoff.md`, and commit.
4. Stop everything you start: no Verdaccio, workerd, Collector or port is left running.

## Evidence

Each slice's "done when" run is captured with `tools/evidence/capture.sh M0.<nn> <name> <exit> -- <command>` under
`design/evidence/M0.<nn>/`, never retyped.

## Reporting

When the gate passes on `main`, report to the session that started this goal, for Aaron's ear: what landed, the
gate's result, what was decided, and anything that needs him.
