# S31: an operation's model carries `breaks`, every rule it can break, with a refusal or without

Decided 21 November 2026 by the checks author for snag S-31 (Goal 3), under "Who decides" in `AGENTS.md`. Evidence: a probe of `breakersOf` over Plugged In's compiled model, run on `goal/stage-1` at `e6dc1733`.

## The problem

`profile.onePagePerHandle` refuses nothing, yet `handle.claim` makes a profile and the runtime checks the rule before the commit. The compiler computes every rule an operation can break (`breakersOf`,
`packages/compiler/src/modules/model/internal/invariants.ts:102`, its `breaks`), and `describe.ts:170` keeps only `refusals` (`operations.<op>.invariants`, refusal to rule). So the wire never carries a rule
with no refusal on an operation, and the portal's rules stop can name only the rules that refuse.

## What `breakersOf` really returns for Plugged In today

```text
handle.claim    refusals { HandleTaken: handle.oneHolderPerName, HandleAlreadyOwned: handle.oneNamePerPerson }   breaks [handle.oneHolderPerName, handle.oneNamePerPerson]
handle.release  breaks []
handle.resolve  breaks []        link.add, link.order, link.remove  breaks []
profile.get     breaks [profile.onePagePerHandle]
```

Two facts the brief did not have. `handle.claim` does not break `profile.onePagePerHandle` by the compiler's rules: its one step is `Blueprint.step.database()`, which names no `writes: [Profile]`, and G5 section 3 says in so many words that
it "misses `handle.claim`" for this reason. And `profile.get`, a read, does break it, by section 3's third rule (a thing with no machine, an operation on it with a database step; "coarse on purpose").

## The call

1. **The field is `operations.<op>.breaks`**: a list of full rule names, `<thing>.<rule>`, each once, for every rule the operation can break by section 3's three rules, whether or not the rule owns a refusal. It is the compiler's `breakersOf(...).breaks`, unchanged,
   in the compiler's order; a checker sorts before comparing. An operation that breaks nothing carries `[]`, not an absent key, so a reader can tell "none" from "an older wire".
2. **`invariants` stays what it is**: refusal to rule, only for rules that refuse. Every rule an operation attaches a refusal for is among its `breaks`; the converse is false (that is the snag).
3. **The wire keeps it** (`ModelWire`'s operation schema names `breaks`, an array of strings; the digest covers it), and the portal's rules stop is read from it: a `spine-rule` for each rule in `breaks`, with that rule's sentence and a link to its row, and no refusal for a rule that owns none.
4. **Plugged In's `handle.claim` names its write**: `steps: { record: Blueprint.step.database({ writes: [Profile] }) }` in `examples/plugged-in/blueprint/things/handle/verbs/claim.ts`, so the model says what the runtime already checks. This is the builder's change (a blueprint edit and a regenerate), and the checks fail without it.
   Section 3's coarse third rule stays: `profile.get` keeps `profile.onePagePerHandle` in its `breaks` and shows a rules stop. The checks pin that, so the portal's fixture tells the truth about the model; tightening section 3 is a later call and
   would move the pinned lines in `packages/compiler/src/modules/model/breaks.test.ts` and `e2e/m1/rules-fixture.ts` together.

## The checks

- `packages/compiler/src/modules/model/breaks.test.ts` (a rule with no refusal, a rule of another thing broken through `writes`, a rule with none broken, Plugged In's claim, release and get) and `packages/portal/src/modules/wire/breaks.test.ts` (decoding keeps the list; empty stays empty; a non-list is refused). Reds are in `packages/*/expected-failing/breaks.txt`.
- Check 28 (`e2e/m1/28-st1-22-rules-in-the-portal.test.ts`, `rules-fixture.ts`, `rules-standin.ts`): the spine is judged against `breaks`. `handle.claim` lists all three rules, the page rule with its sentence and link and no refusal;
  `handle.release` has no stop; `profile.get` has one for the page rule only. Fourteen new controls plant the wrong stops (refusals only, every rule everywhere, the thing's own rules, a rule twice, no sentence, no link, the wrong row, a refusal on a rule that owns none, hidden, outside the stop). The two spine tests of the real portal are listed in `e2e/m1/expected-failing/28-st1-22-rules-in-the-portal.txt`.

## Supersedes

- `design/decisions/G5-invariants.md` section 3: "Both are accepted for a rule with no `refuse`" → "the missed `handle.claim` is named in its step (`writes: [Profile]`), and the model carries `breaks`, S31"
