<!-- Generated from the blueprint. Do not edit. -->
# ticket.check-in

Let the holder in at the door. A ticket gets in once.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |

## Answer

(none)

## Move

`checkIn`: from issued to checkedIn, emitting TicketCheckedIn.

## Steps

- `ticket.check-in.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TicketNotIssued | 72 | TI-900 | the ticket is in a state checkIn can't start from; carries `state` |

## How to call

```sh
tickets ticket check-in --ticket <ticket>
```

HTTP: `POST /ticket/check-in` with the payload as JSON. SDK: `Sdk.ticket.check-in(payload)`.
