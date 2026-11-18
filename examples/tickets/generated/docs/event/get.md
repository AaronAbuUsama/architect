<!-- Generated from the blueprint. Do not edit. -->
# event.get

Read one event by its id: title, places, claimed, state.

**Who may call:** anyone.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | event.id |

## Answer

| field | value |
|---|---|
| title | event.title |
| places | event.places |
| claimed | event.claimed |
| state | text |

## Refusals

(none)

## How to call

```sh
tickets event get --id <id>
```

HTTP: `POST /event/get` with the payload as JSON. SDK: `Sdk.event.get(payload)`.
