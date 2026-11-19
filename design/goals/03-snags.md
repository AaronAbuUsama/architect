# Goal 3: the snag log

Every snag the climb hits, in the goal file's form ("A snag entry" in `03-stage-1-hill-climbed.md`). A framework builder
takes each, check first, and the climber comes back to that step once it is fixed. Snags found while writing the floor
(by the journey author and the checks author) are logged the same way, with "Hit" naming who hit them. Status is one of
`open`, `building` (with its PR), `fixed` (with the change), or `parked` (with an owner and a reason).

## S-01 · prove · every run's numbers come from its text
- Hit: the checks author, writing the climb recorder (#110): `ortho prove` prints only text, so `tools/climb/record.mjs`
  parses each journey's line to append `runs.jsonl`.
- Lost: none yet; a format change to prove's lines would silently break the curve.
- Cause: `packages/cli/src/main.ts` writes `report.lines` and nothing structured.
- Fix: framework, `ortho prove --json` (or a report file) with journey, step, verdict, expected, got, file; the recorder
  and the climb check read it. Waits on #76, which owns `packages/cli/src/main.ts`.
- Status: open

## S-02 · climb · prove names no handler file and no declaration
- Hit: the checks author, climb property 3 (#110), all five planted fixtures: `✘ "olga spends some and is told what is
  left": answer "500", expected "380"`, with no `src/…` or `blueprint/…` path.
- Lost: on every red step a climber has to work out which file to open.
- Cause: the failing-step line carries journey, step and cause only; the model already has each declaration's file.
- Fix: framework, the failing step names `src/<thing>/<verb>.ts` and `blueprint/things/<thing>/verbs/<verb>.ts`.
- Status: open

## S-03 · climb · a missing span doesn't say what was there
- Hit: the checks author, climb property 2 (#110): `✘ "…": span allowance.spend.record missing`.
- Lost: the climber can't see which spans did occur.
- Cause: the spans check reports only the missing name.
- Fix: framework, the line says what was expected and lists the spans that came back.
- Status: open

## S-04 · claim · a handler can't look a record up by a field
- Hit: the journey author, proving the spec satisfiable (#107): claiming a name needs "is this name taken?", and
  `Records` offers only `find`, `insert` and `update` by id; the scratch handlers used `Store.list`, which a handler
  can't reach.
- Lost: a climber with only `src/` stops at the first claim step.
- Cause: no lookup by field (or unique index) in the handler's records.
- Fix: framework, a declared unique field (or `Records.findBy`) in the handler's context, check first.
- Status: open

## S-05 · journeys · a starting world serves one journey
- Hit: the journey author (#107): a world that claims a name can be used by one journey only, so five near-copies.
- Cause: worlds share one database and names must differ.
- Fix: framework or journey API, a world parameterised per journey (or names minted per run).
- Status: open

## S-06 · journeys · a world's `gives` returns only `s.last`
- Hit: the journey author (#107).
- Fix: journey API, `gives` names more than the last answer.
- Status: open

## S-07 · journeys · a step can't compare against the previous answer
- Hit: the journey author (#107).
- Fix: journey API.
- Status: open

## S-08 · journeys · a refused step leaves `s.last` unchanged
- Hit: the journey author (#107): one step relies on it; it should be stated, or `s.last` should hold the refusal.
- Fix: journey API, decide and document.
- Status: open

## S-09 · journeys · no journey can send a malformed payload
- Hit: the journey author (#107): `InvalidPayload` can't be reached, so runtime refusals coverage stays 6 of 7.
- Fix: journey API, a raw payload step.
- Status: open

## S-10 · scaffold · a handler scaffold misses declarations added after it was written
- Hit: the journey author (#107): four handlers had to be re-scaffolded to pick up new refusals.
- Fix: framework, K16 (#76) territory; recheck once #76 lands.
- Status: open

## S-11 · grid · the CLI and MCP error cells can't be judged live
- Hit: the checks author (#110): `error.cli` and `error.mcp` need the refused call seen through each client.
- Fix: framework, `prove --through` (M2.08).
- Status: open

## S-12 · runtime · a reused request key with another payload is a defect (ledger HAN-10)
- Hit: Aaron's review of #95.
- Fix: framework, a typed built-in refusal `IdempotencyConflict` over HTTP, the SDK and the CLI; an early framework slice
  after #76 lands.
- Status: open

## S-13 · wallets · a send that never reaches depth is a defect (ledger HAN-11)
- Hit: the 🔍 review of #104.
- Fix: framework, a typed failure in `SendRefused`; an early framework slice after #76 lands.
- Status: open

## S-14 · describe and portal · journey redaction is three rules, not one (ledger HAN-12)
- Hit: the 🔍 review of #109 on m1 (advice item 5).
- Cause: `packages/compiler/src/modules/model/internal/journeys.ts` redacts a blank operation's payload and `emits` to
  public fields (undeclared keys hidden), but a completed operation's payload and `refuses` hide only declared non-public
  fields, so an undeclared key stays visible.
- Fix: framework, one redaction rule shared with the visibility module (M1.35, #95), check first; after #95 lands.
- Status: open
