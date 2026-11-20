# W1: a count with no metrics source is `not yet`, except where an eval forces a digit

Decided 20 November 2026 by the website builder, on the 🔍's block of PR #159.

## The rule

The telemetry contract says an unavailable source reads as unavailable, never as zero. So on every page, a figure that comes from
the metrics (`ortho.calls`) or the calls (the window's spans) is drawn only when its source was read. When it was not, the page says
`not yet` with the source's reason, carries no `data-*` attribute for the figure, and never writes `0`:

- the reference page's refusal rows (`reference.tsx`): `not yet`, no `data-count`, no `data-span`;
- the calls footer (`calls.tsx`): `data-shown`, `data-total` and `data-door-refusals` are each left off when unread;
- lit rows and arrows (`live.ts` `litOf`, `moveLit`): `data-lit="unknown"` when there is no source, so an unread window is never read as "no run".

A zero that remains is a count from a source that was read (the window held no call of that operation).

## The one exception, and why

`error.portal` (`e2e/grid/src/modules/refusal-evals/internal/surfaces.ts:40`) requires `data-count` to match `/^\d+$/` on every
`refusal-code` of an operation's page, and the grid serves the portal with **no** live source. So the Refusals list of the operation
page (`operation.tsx`) writes `data-count="0"` when there is no source. It also writes `data-counted="false"` beside it, so a reader of
the page can tell a counted zero from an unread one.

That zero exists only because the eval forces it. The lead has flagged the eval to the checks author (the builder never edits evals).
The moment the eval accepts an absent count, `operation.tsx` drops `data-count` (and `data-counted`) when `refusalCount` is `null`,
the same as the reference page.

## Also recorded

The pages are plain elements with `data-portal` hooks, not the named `portal-ui` components `design/portal.md` (the component
inventory) maps every data shape to. See `design/later.md`, "The portal's pages on portal-ui components".
