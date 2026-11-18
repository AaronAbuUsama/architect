<!-- Generated from the blueprint. Do not edit. -->
# ticket.get

Read one ticket by its id: event, holder, seats, state.

**Who may call:** anyone.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | ticket.id |

## Answer

| field | value |
|---|---|
| event | ticket.event |
| holder | ticket.holder |
| seats | ticket.seats |
| state | text |

## Refusals

(none)

## How to call

```sh
tickets ticket get --id <id>
```

HTTP: `POST /ticket/get` with the payload as JSON. SDK: `Sdk.ticket.get(payload)`.
