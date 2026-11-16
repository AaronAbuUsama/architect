# F1 verification receipt

16 November 2026. Static prototype verification only; no framework proof or live service.

## Browser observations

Ego browser, 1440 × 1040 desktop and 390 × 844 mobile. All eleven routes (home, specification, derived work, thing, operation,
change loop, docs, journeys, environments, releases, later capabilities) reported body width equal to viewport width after the responsive table fix. Fourteen screenshots (the four required views plus specification, derived work and docs at each size)
are retained in `screenshots/`. Updated files were reloaded with browser cache disabled before final capture.

| Scenario | Stale cells | Failed cells | Recorded-pass cells | Meaning |
|---|---:|---:|---:|---|
| No retained evidence | 0 | 0 | 0 | Honest default |
| Synthetic budget edit | 2 | 0 | 10 | Spend stale in staging/production only |
| Synthetic latest failure | 0 | 1 | 11 | Spend staging failed; no older green there |
| Synthetic offline | 0 | 0 | 0 | No green retained as current |

These counts exercise authored display scenarios, not the proposed snapshot status algorithm. There is no
logbook connection and the prototype does not claim to verify ledger selection or signed provenance.

Machine walkthrough returned AllowanceSpent, active to active or exhausted. The change loop traversed its
five authored stages through a failure and corrected proposal. An entered HTML image string remained text;
no image element was injected into main. No script executed from that draft. Native control labels and
keyboard focus/skip-link affordances were inspected; no comprehensive automated accessibility audit was run.

Fixture verification: the three data/docs files match the exact pinned Git artifacts, and their JavaScript
embedding regenerates byte-for-byte. Both JavaScript syntax checks and git diff --check passed.
The Impeccable mechanical detector returned `[]`. No dependencies were installed.

## Independent review

**pass** — independent read-only reviewer, candidate `bdd4655` with verification-only commit `90ff1e0`.

No blocking finding. All five F1 questions, early contract, real acme example, rubric and bounded build steps
were checked. Compiler dependency/hash semantics, model types, generators, logbook fields/routes and version
classification were compared with the pinned stage-three source. Current main is included; only design/spike
files change. Fourteen refreshed desktop/mobile screenshots were reviewed.

One advisory was corrected: the opening HTML comment now says lifecycle and system explanation lead home,
matching the revised screen. It had retained the earlier evidence-first wording.

Visual disposition:

- Thesis: understand the coded promise, then judge its evidence.
- Own-world: actual acme fields/events/budgets and missing projections give the neutral shell substance.
- Story: specification → derived work → evidence → reviewed change is coherent.
- First viewport: desktop establishes intent; mobile remains readable with lifecycle below initial controls.
- Form: restrained HeroUI-style shell, clear labels, responsive stacking; tables intentionally scroll.

Review changed no files and started no server. CI remains the landing gate. This receipt adds no claim of
framework integration, accessibility certification or live-service proof.
