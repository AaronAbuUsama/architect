<!-- Generated from the blueprint. Do not edit. -->
# ticket.cancel

Cancel a ticket before the door. Its seats are not sold again.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |

## Answer

(none)

## Move

`cancel`: from issued to cancelled, emitting TicketCancelled.

## Steps

- `ticket.cancel.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TicketNotIssued | 72 | TI-900 | the ticket is in a state cancel can't start from; carries `state` |

## How to call

```sh
tickets ticket cancel --ticket <ticket>
```

HTTP: `POST /ticket/cancel` with the payload as JSON. SDK: `Sdk.ticket.cancel(payload)`.
