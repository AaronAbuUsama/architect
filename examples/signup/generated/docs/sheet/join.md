<!-- Generated from the blueprint. Do not edit. -->
# sheet.join

Take places on a sheet, for yourself and anyone with you.

**Who may call:** anyone.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| sheet | sheet.id |
| people | Count |

## Answer

| field | value |
|---|---|
| left | Count |

## Move

`join`: from open to open or full, emitting PlaceTaken.

## Steps

- `sheet.join.load` (database)
- `sheet.join.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SheetFull | 71 | SH-001 | declared in errors.ts, carrying left |
| SheetNotOpen | 70 | SH-900 | the sheet is in a state join can't start from; carries `state` |
| SheetNotFound | 4 | SH-901 | nothing has the id in sheet; the handler never runs; carries `id` |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
signup sheet join --sheet <sheet> --people <people>
```

HTTP: `POST /sheet/join` with the payload as JSON. SDK: `Sdk.sheet.join(payload)`.
