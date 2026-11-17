# Gate 2 planted fixtures (layer two)

Written by the author of Gate 2's checks (`e2e/layer2/`), never by the builder. Each folder has its own README: what it plants, where it is
installed in a copy of acme, and what must catch it. They sit outside the Nx graph (`.nxignore`) and are not typechecked in place.

| Folder | Plants | Used by |
|---|---|---|
| `list-read/` | `allowance.list` and the journey `an owner lists allowances` | checks 3, 4 |
| `slow-spend/` | an `allowance.spend` handler slow through real D1 work | check 8 |
| `looser-budget/` | `allowance.spend` with a 300 ms budget | checks 3, 8 |
