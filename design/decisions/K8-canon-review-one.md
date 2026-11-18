# K8: the canon's first review: names swept now, the entity, and event tickets

Decided 18 November 2026. Aaron reviewed layer 1 of the canon (#38) in the preview and found four things: old names
mixed with new ones, the retired word "target", code examples too small to show anything around them, and an example
(the sign-up sheet) that "does not like jell with me". The round put three choices to him, each with its code, and he
answered "Yes, A on all three".

## Aaron's calls

1. **The code is renamed now, before the canon is reviewed.** What you read and what runs say the same names. This
   changes step 1 of K6's "Order", which put the sweep after #38: the sweep (#51) carries #38's commits, and #38 is
   stacked on it. The `@orthograph` npm org is still Aaron's to create, before anything is published, not before the
   sweep.
2. **The second store kind is the entity, named after Effect Cluster's `Entity`.** Aaron asked about "clusters ... not
   quite a durable object". An entity is one addressed instance with its own mailbox; a Durable Object is how the
   Cloudflare host runs one. `lives: "actor"` becomes `lives: "entity"`. The portal brief already put each Durable
   Object behind an Effect service shaped like an `@effect/cluster` entity
   ([`../briefs/F4-portal-plan-and-state.md`](../briefs/F4-portal-plan-and-state.md), lines 99-100), so leaving
   Cloudflare is one seam.
3. **The canon's example is free event tickets**, replacing the sign-up sheet. Two things: an `event` (draft, on sale,
   sold out, over) and a `ticket` (issued, checked in, cancelled). Claiming a ticket refuses `SoldOut` and writes the
   ticket in the same commit; a ticket is checked in at the door or cancelled. No money, no people beyond `anyone`.
   Support tickets were ruled out because they need roles between people (M2), and paid tickets because they need
   Stripe, a workflow and money (M5): "other machinery that's just not even here" (Aaron, earlier the same day).

## The building agent's calls

- **"Target" leaves the code too**, not only the canon: the compiler's types, the declaration's comments, the tests
  and the generated `errors.ts` say language. Other meanings stay (an environment a revision is promoted to, a
  platform a binary is built for).
- **Pages open on whole files.** Each page shows the example's folder tree and the full file a concept lives in
  before any narrow quote, so a reader sees what sits around each line.
- **What "entity" means today** is the rename and the shape: the store kind, the model's `lives`, the host module and
  the Durable Object class. Running entities on `@effect/cluster` itself, off Cloudflare, is a later slice and goes in
  [`../later.md`](../later.md).
- **acme stays the tests' fixture.** The workshop mini-DAO stays the example from layer 4 on (K5).
