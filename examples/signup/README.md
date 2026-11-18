# signup: the canon's example

A sign-up sheet with a fixed number of places, and nothing else: no people, no organisations, no money, no time. Aaron
picked it on 18 November 2026 as the example the canon teaches with, because everything in it explains itself
(`docs/canon/outline.md`). acme stays the fixture the tests and gates run on.

| Declaration | What it shows |
|---|---|
| `blueprint/things/sheet/thing.ts` | a thing with an id, a named text and two counts |
| `blueprint/things/sheet/machine.ts` | states `open`, `full`, `closed`; `join` has two outcomes, the last place fills it |
| `blueprint/things/sheet/verbs/join.ts` | a payload, an answer, a refusal that depends on data (`SheetFull`), steps, `idempotent: "request"` |
| `blueprint/things/sheet/verbs/get.ts` | a read: no handler, no move |
| `src/sheet/*.ts` | the three handlers, the only code written by hand |
| `journeys/` | written first, by a different agent, failing on the blank handlers before they were filled |

```bash
node ../../packages/cli/src/main.ts check
node ../../packages/cli/src/main.ts prove --env local --port 8890
```
