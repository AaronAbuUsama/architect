<!-- Generated from the blueprint. Do not edit. -->
# link.order

Move a link to a zero-based position. A position past the end puts it last.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| link | link.id |
| position | LinkPosition |

## Answer

(none)

## Steps

- `link.order.load` (database)
- `link.order.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LinkAlreadyRemoved | 32 | LN-002 | declared in errors.ts |
| LinkNotFound | 4 | LN-901 | nothing has the id in link; the handler never runs; carries `id` |

## How to call

```sh
plugged-in link order --link <link> --position <position>
```

HTTP: `POST /link/order` with the payload as JSON. SDK: `Sdk.link.order(payload)`.
