<!-- Generated from the blueprint. Do not edit. -->
# event.close

End the event. No tickets are claimed after this.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| event | event.id |

## Answer

(none)

## Move

`close`: from onSale or soldOut to over, emitting EventOver.

## Steps

- `event.close.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EventNotOnSale | 70 | EV-900 | the event is in a state close can't start from; carries `state` |

## How to call

```sh
tickets event close --event <event>
```

HTTP: `POST /event/close` with the payload as JSON. SDK: `Sdk.event.close(payload)`.
