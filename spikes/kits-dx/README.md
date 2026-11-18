# Spike: kits and the builder's DX, start to finish

A design spike: its output is a decision, a tutorial and a sketch, not running code. It supports
`design/decisions/K1-kits.md` (D4, the kit format).

## Question

What exactly is a kit, and where does a builder declare where code runs, who may reach it and what exists in each
environment, so that a tutorial from `pnpm create architect acme` to mounting wallets, payments and email kits is true
end to end?

## What was tried

- Read the brief `design/briefs/K1-kits-and-surfaces.md` against the code on `origin/layer/3` at `3bacbf3`: the
  blueprint's operations, roles, identity and environments; target-effect's access check; host-cloudflare's auth (how a
  principal is made from a bearer, an `ak_` key or an MCP OAuth token); the compiler's layout and model; the generators'
  renderers; the CLI's `add`; prove's journey loading and world.
- Graded four ways of saying "who may reach it" (expose on a mount, an allow-list per surface, an audience field, the
  credential kind in `allowed`) in code, on one scenario, with the rubric in the record.
- Tested the kit shape on six kits (auth, wallets, chain, payments, email, erc20), writing out for each its things,
  operations with `runs` and reach, dependencies, inbound entries, runtime pieces, choices, needs, world implementation
  and what each target gets.
- Wrote the tutorial as a page and acme with four kits mounted as files, then checked every file and command against
  the record.
- Checked the public npm registry: `@architect/architect` belongs to another project; `create-architect` is free.

## What was found

1. The credential kind is already known where the principal is made, and then dropped. `host-cloudflare/src/modules/
   auth/service.ts:15-22` tells an `ak_` key from a bearer; only `/mcp` calls `oauth.bearer`. A device-login token is
   an ordinary session token today, so telling it apart needs one field on the session row.
2. An agent's OAuth token on the HTTP API is refused today only because `getSession` cannot read it and answers
   anonymous. Any surface-only filter (hiding MCP tools) would leave that accident as the only guard.
3. Hiding is not refusing, so the credential kind belongs in `allowed`, enforced by the runtime on every route; the
   generators work out surfaces from `runs` and `allowed`; the environment says which kinds it issues.
4. Six kits forced five corrections to the brief: kit operations may use only the kit's own roles (so acme's
   `api-key.create` and a refund stay the app's, over a kit dependency); agents never link a wallet; `wallet.link` is a
   client operation over two server operations; wallets needs auth, not chain; and implementations are chosen by host
   (node, browser, worker, world), not by environment.
5. The design's own words already exist for two of the brief's new ones: "dependency" (what you call) and, for the
   brief's "inbound", `decisions.md`'s "edge", which collides with the model's `edges.json`. The record keeps
   "dependency" and "inbound".
6. Two documents disagreed: journeys live in `blueprint/journeys/` (prove's loader and `add journey` say so; acme and
   the brief used the root), and one package per kit rather than `@architect/std` subpaths.
7. The brief said there is no `create`; there is one: the Nx preset writes `examples/starter` (L1.50), proven from
   Verdaccio by `tools/e2e/starter.sh`. `pnpm create architect` is decided as a thin entry over that same preset, so
   there is one template. (Caught by the 🔍 review of this spike.)

## The decision it supports

`design/decisions/K1-kits.md`: the three-place split with `via` on the principal (option E), the generation rule, the
exact commands of the tutorial, what a kit is and how it is mounted, named and proved across projects, journeys for
kits and client operations, the design loop, and stage 4's steps L3.01a to L3.01h before the kits themselves.

## What is here

| Path | What |
|---|---|
| `tutorial.html` | the tutorial, start to finish, each step marked works today, today with proposed parts, or proposed. A static page: open it in a browser, no server. A private copy: https://claude.ai/artifact/K2ShGa6XGBDGXiqgdEczb8 |
| `acme/README.md` | acme with auth, wallets, payments and email mounted: the folders, the generated files, and what each target gets |
| `acme/**/*.ts` | the files that change, each marked PROPOSED; not compiled, not imported |

## Open risks

1. Whether Better Auth 1.7.15's session hook sees the device-token path (fallback: mark the row in `AuthD1.handle`).
2. Minting an agent token inside a world that the provider's own check accepts.
3. Browser signers need a real browser in the kit's CI; conditional exports for client operations are untested (the
   runs-client spike, S-RC).
4. Payments' and email's world stand-ins are extra local processes, like Anvil.
5. Narrowing is limited to `via` and `omit` so that it is provably tighter; if apps often need a kit operation decided
   by their own role, revisit with evidence.
6. Questions only Aaron can answer are batched at the end of the record: whether the builder's generators ship in stage
   4, the public npm scope, and whether payments and email become standard kits.
