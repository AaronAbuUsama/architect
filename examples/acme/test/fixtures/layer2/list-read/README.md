# list-read

**Plants:** the new read of the docs' step 10, `allowance.list`, and the journey for it.

| File | Install as | What it is |
|---|---|---|
| `list.ts` | `blueprint/things/allowance/verbs/list.ts` | the docs' declaration (`where`, `order: "newest"`, `page: 50`, `allowed: [owner.of("organization")]`, budget 100 ms), written over what `forman add read allowance.list` makes |
| `an-owner-lists-allowances.ts` | `journeys/an-owner-lists-allowances.ts` | `an owner lists allowances`: ada lists the funded world's one allowance (olga's, `active`, limit 500, spent 0, no events); a filter on a member with none gives an empty page; bob is refused `NotAllowed` |

**Why a fixture:** the journey imports `list.ts`, so it typechecks only in a copy where the read exists. It is not in `journeys/`.

**What must catch it:** after `forman add read allowance.list`, installing both and `forman generate`, `forman impact` prints
`next 1.1.0` and `stale none`, and `forman prove --env local` prints `allowance.list 9 evals ✔` (Gate 2 check 3; check 4 uses it for the
`1.1.0` release).

**Contract chosen where the docs were silent:** a read with `where` answers a page, `{ items, next }`, and takes the `where` fields as optional
filters in its payload. The compiler and `Blueprint.read` do not have `where`, `order` or `page` yet (they take only `by` and `fields`).
