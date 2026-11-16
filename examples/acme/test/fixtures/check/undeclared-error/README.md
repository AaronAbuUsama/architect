# undeclared-error (check)

**Reuses:** `../../types/undeclared-error/spend.ts`, installed over `implementation/handlers/allowance/spend.ts`. No copy here.
**Must fail:** `architect check` exits 1 at its `types` step (tsc), with a message naming `implementation/handlers/allowance/spend.ts`.
