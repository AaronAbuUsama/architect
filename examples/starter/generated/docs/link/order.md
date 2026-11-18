<!-- Generated from the blueprint. Do not edit. -->
# link.order

Move a link to a zero-based position. A position past the end puts it last.

**Who may call:** the linkOwner of the link.

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
| LinkAlreadyRemoved | 6 | LI-002 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't the linkOwner of the link; the handler never runs |

## How to call

```sh
starter link order --link <link> --position <position>
```

HTTP: `POST /link/order` with the payload as JSON. SDK: `Sdk.link.order(payload)`.
