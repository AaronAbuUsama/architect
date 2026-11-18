<!-- Generated from the blueprint. Do not edit. -->
# event.claim

Claim a ticket for one or more seats, held under a name.

**Who may call:** anyone.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| event | event.id |
| holder | ticket.holder |
| seats | Count |

## Answer

| field | value |
|---|---|
| ticket | ticket.id |
| left | Count |

## Move

`claim`: from onSale to onSale or soldOut, emitting TicketsClaimed.

## Steps

- `event.claim.load` (database)
- `event.claim.issue` (database)
- `event.claim.count` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SoldOut | 71 | EV-001 | declared in errors.ts, carrying left |
| EventNotOnSale | 70 | EV-900 | the event is in a state claim can't start from; carries `state` |

## How to call

```sh
tickets event claim --event <event> --holder <holder> --seats <seats>
```

HTTP: `POST /event/claim` with the payload as JSON. SDK: `Sdk.event.claim(payload)`.
