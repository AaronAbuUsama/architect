# undeclared-error (check)

**Reuses:** `../../types/undeclared-error/spend.ts`, installed over `src/allowance/spend.ts`. No copy here.
**Must fail:** `forman check` exits 1 at its `types` step (tsc), with a message naming `src/allowance/spend.ts`.
