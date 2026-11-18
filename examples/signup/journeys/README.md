# Journeys and planted fixtures (signup)

Written by the journey author, not the builder. The builder never edits these files, the evals or the runner's generic checks.

## Files

- `blueprint/starting-worlds/opened.ts`: a visitor (`anyone`) runs `sheet.open({ title: "Saturday clean-up", places: 2 })`; it gives `sheet`.
- `journeys/*.ts`: four journeys, below. A journey's name is its file name with spaces.

Nothing here has people, organisations or auth: every operation is `allowed: [Blueprint.anyone]`, so every cast is a visitor.

## Journeys

| Journey | World | Cast | What it proves |
|---|---|---|---|
| `put-up-a-sheet` | none | visitor (anyone) | `sheet.open` answers a `sht_` id, emits `SheetOpened { places: 3 }`, leaves the sheet `open`; `sheet.get` reads back title, places 3, taken 0, `open`; no events on the read |
| `fill-a-sheet` | `opened` | visitor | 1 person joins: left 1, `PlaceTaken`, still `open`; 2 people are refused `SheetFull { left: 1n }` (no events, no `record` span, still `open`); 1 person joins: left 0, now `full`; one more is refused `machine.notFrom { state: "full" }` with no events and no `record` span; `get` reads taken 2, `full` |
| `join-twice-with-one-request` | `opened` | visitor | the same request key twice gives the same answer (left 1), the second emits nothing and has no `record` span; `get` reads taken 1, `open` |
| `a-closed-sheet-takes-no-one` | `opened` | visitor | close emits `SheetClosed`, moves to `closed`; joining it and closing it again are both refused `machine.notFrom { state: "closed" }` with no events and no `record` span; `get` reads taken 0, `closed` |

## Coverage this gives

- Moves: open 2/2 (world and `put-up-a-sheet`), join 1/1, close 1/1.
- Outcomes of `join`: `open` and `full`, both in `fill-a-sheet`.
- Refusals: `SheetFull { left: 1n }` and `SheetNotOpen` (from `full` and from `closed`, join and close).
- `get`: read after every kind of change; always `noEvents`.

## Where the docs were silent

- **`SheetFull`.** `join` takes `{ sheet, people }` and refuses when `people` exceeds the places left, so it is reached without a race.
- **Spans.** Names follow acme's rule `<thing>.<verb>` and `<thing>.<verb>.<step>`: `sheet.open.insert`, `sheet.join.load`, `sheet.join.record`, `sheet.close.record`. `get` has no span assertions.
- **Request keys.** `fill-a-sheet` gives each join its own request key, so none is a replay. Every join takes `people: 1n` except the refused one.
