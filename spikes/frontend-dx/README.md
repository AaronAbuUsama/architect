# Spike: the blueprint's frontend DX

**Question.** Can one generated-data seam serve a plain read-only portal now and a licensed HeroUI face later,
while making the system, its promises, evidence and change consequences understandable?

**Answer.** Yes as a design, with explicit missing-data states. The real acme model supplies things, operations,
reads and environments. Journeys, individual evals, traces and proof origin need new generated/evidence projections.
This spike demonstrates presentation and failure states; it does not build the portal adapter or agent backend.

## What was tried

Read the F1 brief and design on `origin/layer/3`, pinned to `b9cc55f0bb0401d6d593024487871465b19507f5`.
Inspected the compiler, generators, logbook and acme. Indexed a private source snapshot with codebase-memory-mcp
before code discovery. Independently audited the six supplied HeroUI archives without installing them.

Open [index.html](index.html) directly in a browser. No server, installation, account, token or network call is needed.
The app opens on actual declarations with evidence unavailable. The scenario selector makes synthetic budget-stale,
latest-failure and offline cases reviewable. Navigate to home, allowance, spend, docs and the change-request preview.
Specification and Derived work preview both loops and blueprint-derived context. They do not invent a plan or run history.
The change preview is an authored five-stage walkthrough, not a general-purpose agent. Text entry changes only its
displayed draft; its example patch always demonstrates the specific budget change from 150 to 120 ms.

## What was found

1. Acme's **committed generated artifact** has 8 things, 15 operations/reads, 6 named values and 4 environments.
   It is retained byte-for-byte in `acme-model.json`, alongside `acme-edges.json` and the exact generated spend docs.
   This is not a claim that fresh generation matches source at another revision.
2. The source model has no journey/world projection. The logbook has aggregate pass/fail and verified provenance,
   but no per-eval rows, timestamps, trace ids or executed/carried origin. The mock displays these limits openly.
3. A budget-only change makes spend stale while leaving other declarations unchanged. The synthetic scenario displays
   stale on spend in staging/production only. A later staging failure never displays an older green pass there.
4. The browser mock uses original HTML/CSS/JS with a neutral HeroUI-style vocabulary. No protected template source,
   kit asset or token is included. The actual Pro package and its dependency closure were not installed or executed.
5. The downloaded chat template simulates submission with timers. Durable requests, agents, checked diffs and proof
   are Architect work, not capabilities supplied by the chat UI. See [the audit](heroui-audit.md).
6. Reading matters: the home explains organization, allowance and spend before evidence; Docs has its own route,
   a reader view and a link back to the operation. The exact generated Markdown remains inspectable.

## Measurements and verification

From the repository root:

```sh
python3 spikes/frontend-dx/fixtures.py --check
node --check spikes/frontend-dx/main.js
node --check spikes/frontend-dx/acme-data.js
git diff --check
```

`fixtures.py` checks all three fixtures against the exact Git revision and checks that `acme-data.js` can be rebuilt
deterministically. Run it without `--check` after deliberately updating the reviewed fixture inputs. It never reads
project source at app runtime. The committed fixture script has a generated header and is not hand-edited.

Browser inspection: desktop 1440 × 1040 and mobile 390 × 844. Screenshots are under `screenshots/`, four required
views plus Specification, Derived work and Docs at each size. Tables intentionally scroll within their containers on mobile. Native anchors, select, buttons
and textarea remain keyboard accessible; the skip link and visible focus are present. A mechanical design scan
reported no findings. These are scoped static-mock checks, not WCAG certification or HeroUI runtime proof.

The final browser receipt and independent review outcome are recorded in `review.md`. No full framework test suite
or acme prove was run locally for these design-only additions. Repository CI must pass before merge. This change
does not edit `packages/`, journeys, evals, the runner, the build plan or any `layer/*` branch.

## The decision it supports

[F1-frontend](../../design/decisions/F1-frontend.md): a versioned generated blueprint plus a live same-origin snapshot
adapter; a system-first home with contextual evidence; package-owned frontend logic and project-generated data;
React Router browser face on workerd; Fumadocs components; licensed Pro integration after its distribution scope
is established. The contract is early in the decision for L2.10's builder. Build-step proposals are recorded there.

This design spike shares `design/frontend` with its decision record, as the F1 brief explicitly directs; it does not
use the generic spike branch convention. It is never imported by framework packages.

## Open risks

- Pro account entitlement and framework distribution scope remain unknown; the Figma canvases were not imported.
- The candidate age-eligible package cohort still needs complete peer/transitive resolution and runtime checks.
- The proposed snapshot adapter, decoding, historic-model comparison and stable-read algorithm are not implemented.
- Existing proof hashes omit handler bodies. An unchanged contract is not proof that a different implementation ran.
- Existing production verdicts may carry staging evidence. The portal must not relabel them as live production proof.
- Cloud access requires authenticated project readers and protected data/search assets, not only protected HTML.

No server, world, container, site or paid resource was created by this spike. Its temporary browser tabs are closed
when verification ends. The user's original archives and kit files remain untouched.
