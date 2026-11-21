# K28: three releases, a preview, a beta and 1.0

Decided 21 November 2026 by Aaron, on the conductor's recommendation. His words, to the conductor: "Okay, yeah. So I
agree with you on your recommendations for those questions."

## The problem

No document defined an alpha or a beta. `milestones.md` defined only v1.0 (the four stage gates on `main`, plus the
release slices), and `handoff.md` direction 12 recorded Aaron's yes to "a preview on npm after Gate M1" with no slice
to carry it; the publish code refuses npmjs (`packages/prove/src/modules/publish/service.ts`). Without release lines,
every goal argued its own priority, and Goal 4 could not tell whether it was on the critical path. The scope map,
`design/scope.md`, reads every capability from the code and sets them against these lines.

## The call

| Release | A person outside can… | Done when |
|---|---|---|
| **Preview** | install Orthograph from npm, write a blueprint, get the server, SDK, CLI, MCP, docs and portal, and prove journeys on their own machine | Gate M1 (M1.15) passes on `main`, and `@orthograph/*` is on npm under `next` (M1.51, new) |
| **Beta** | start an app with `npm create orthograph`, sign people in, claim `@name` on a real page, deploy it to Cloudflare and tear it down | Gate M2 (M2.12), the stage 1 gate, and Goal 3's done check with its staging run |
| **1.0** | wallets and pay by handle; a Safe with budgets, agents and time; a private club on Aztec | stages 2 to 4 on `main`, plus M7.01 to M7.04, M7.06 and M7.13, as `milestones.md` already said |

Options weighed: wallets inside the beta (stage 2 joins it), and no preview with the beta first. Both were set aside.
The first puts Goal 4 on the critical path while Goal 3 reshapes the same core. The second ships nothing until
sign-in works, and drops Aaron's 19 November yes to a preview.

## What follows

- **M1.51, the npm preview**, is added to M1: `publish` may target npmjs for `@orthograph/*` under `next` only, and
  Aaron signs in and runs `npm publish` (direction 12). npm's `latest`, Homebrew and real releases stay in M7.
- **Goal 4 serves 1.0.** Its slices are stage 2 and stage 3 work. It runs beside Goal 3, and its slice 1 (the
  language and host seam) waits until Goal 3's sign-in extraction (M2.05) has settled the host, because both reshape
  `host-cloudflare`.
- **`e2e-stage1` is a required check** on `goal/stage-1` (Aaron's yes in the same words; set 21 November 2026).

## Supersedes

- `design/milestones.md`: "The npm org `@orthograph` is not needed until M7" → "The npm org `@orthograph` is not needed until the preview (M1.51, K28)"
- `design/milestones.md`: "npm, Homebrew and the rest of M7 still wait on the stage 4 gate." → "npm's `latest` tag, Homebrew and the rest of M7 still wait on the stage 4 gate; the preview under `next` is M1.51 (K28)."
