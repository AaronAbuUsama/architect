# F1 verification receipt

16 November 2026. Static prototype verification only; no framework proof or live service.

## Browser observations

Ego browser, 1440 × 1040 desktop and 390 × 844 mobile. All five captured screens (home, thing, operation,
change loop, docs) reported body width equal to viewport width after the responsive table fix. Ten screenshots
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

Pending the independent review of the committed candidate; its final outcome is appended before landing.
