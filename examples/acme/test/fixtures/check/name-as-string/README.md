# name-as-string

**Replaces:** `implementation/handlers/allowance/spend.ts` with `spend.ts` here.
**Breaks:** the handler writes `"allowance.spend"`, a declared operation's name, as a string literal outside `generated/`.
**Must fail:** `architect check` exits 1 on rule `no-name-as-string`, naming `implementation/handlers/allowance/spend.ts`.
