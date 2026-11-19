# pages

The portal's pages as the bytes of a document, every component from `@orthograph/portal-ui` (F7): the frame (tree, top bar with the
environment and window, live rail), home (a card per thing, then the operations matrix with proof), a thing's page (lifecycle first),
an operation's contract and proof, a trace's folding waterfall, journeys drawn as sequence diagrams, and the reference pages (access,
events, machines, refusals).

A page is a pure function of `PageData` (the blueprint, the window's view, the stylesheet's address) and, for proof, a snapshot. It
reads no clock; `now` lives in the window. `data-portal` attributes carry each part's data for the checks and for screen context.

Held, with their seams: environments, plugins and stores, the command palette, the operation's tabs and metrics, field descriptions,
events with their fields, refusal codes (all M1.42's wire or portal.md's coming correction). A trace shows only the attributes `trace.tsx`
names; nothing else can render.

Tests: `pages.test.ts`.
