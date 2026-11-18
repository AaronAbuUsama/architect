# F6: the app `forman generate` writes

Decided 18 November 2026. Aaron took all four recommendations of the grill in PR #41 ("Yes, all four"). The design is
`spikes/generated-app/design/DESIGN.md`; the prototype that tests it is `spikes/generated-app/`. This replaces "the
portal" of F1 and F2 as the thing a project gets; F2's page contents and its environment scope carry over.

## Decided

1. **One app, one tree, live inside each page (Q1 A).** One agent-native app, our own template. The tree is derived
   from the model (things, operations, machines, events, errors, roles, environments) plus the pages and conversations
   people and agents make. An operation's page holds its docs and its live calls together. Live is the home page.
2. **Blocks by reference, prose pinned to a hash (Q2 A).** A generated page is a list of blocks (`<Model>`, `<Live>`,
   `<Scenario>`, `<Note>`, the docs canon's components plus one) with prose between them. A block is drawn at view time,
   never copied, so it can't drift. Prose is saved with what it is about and that declaration's hash; when generate
   moves the hash the prose is flagged with what changed, and kept.
3. **Prose about a declaration lives beside it in the repo; everything else in PGlite (Q3 C).** For example
   `blueprint/things/allowance/verbs/spend.md` next to `spend.ts`, so a pull request that changes a declaration carries
   its prose. Chats, scratch pages, plans, layouts and comments stay in the app's own Postgres (PGlite locally). This
   changes one line of the brief, which put all written pages in Postgres.
4. **Locally, the app calls acme as a member of the world's cast (Q4 A).** A top-bar switcher picks ada, olga or bob;
   the app's server holds their test tokens from `/_world/cast`. Calling as the signed-in person's own acme identity
   comes after M2.01 (principals, `Via.agent`).

## Also settled in the design (no question needed)

- **Telemetry path:** the app reads the Collector's files through prove's `TraceSource`, as PR #39 found. Not Tempo,
  and not OTLP straight into the app, because the Collector is where private attributes are stripped.
- **Docker:** the app runs none. `forman dev` still runs its Collector in Docker; a native `otelcol-contrib` is a
  `forman dev` change for later.
- **Pin:** `@agent-native/core` `0.228.2` (13 November 2026), under R1's three days.
