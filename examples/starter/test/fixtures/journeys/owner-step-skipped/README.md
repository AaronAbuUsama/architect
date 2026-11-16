# owner-step-skipped

**Replaces:** `implementation/handlers/organization/create.ts` with `organization/create.ts` here.
**Breaks:** `organization.create` declares steps `insert` and `owner`; this handler runs only `insert`, so the span `organization.create.owner` is never made.
**Must fail:** eval 6 (steps) on `organization.create`: "declared step organization.create.owner ran no span". Also fails journey `an owner makes an api key`, step "bob founds an organisation of his own" (which requires the `organization.create.owner` span). Journeys that only use `organization.create` as a starting world are unaffected, because world calls are not checked.
**Failure shape:** `organization.create steps ✘ "bob founds an organisation of his own": declared step organization.create.owner ran no span`.
