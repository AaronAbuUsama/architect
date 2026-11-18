<!-- Generated from the blueprint. Do not edit. -->
# event.open

Put an event on sale with a number of places.

**Who may call:** anyone.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| title | event.title |
| places | event.places |

## Answer

| field | value |
|---|---|
| event | event.id |

## Move

`open`: from nothing (it creates) to onSale, emitting EventOpened.

## Steps

- `event.open.insert` (database)

## Refusals

(none)

## How to call

```sh
tickets event open --title <title> --places <places>
```

HTTP: `POST /event/open` with the payload as JSON. SDK: `Sdk.event.open(payload)`.
