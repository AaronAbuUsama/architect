# name-as-string

**Replaces:** `src/allowance/spend.ts` with `spend.ts` here.
**Breaks:** the handler writes `"allowance.spend"`, a declared operation's name, as a string literal outside `generated/`.
**Must fail:** `forman check` exits 1 on rule `no-name-as-string`, naming `src/allowance/spend.ts`.
