<!-- Generated from the blueprint. Do not edit. -->
# sheet.get

Read one sheet by its id: title, places, taken, state.

**Who may call:** anyone.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | sheet.id |

## Answer

| field | value |
|---|---|
| title | sheet.title |
| places | sheet.places |
| taken | sheet.taken |
| state | text |

## Refusals

(none)

## How to call

```sh
signup sheet get --id <id>
```

HTTP: `POST /sheet/get` with the payload as JSON. SDK: `Sdk.sheet.get(payload)`.
