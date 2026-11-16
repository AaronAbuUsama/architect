<!-- Generated from the blueprint. Do not edit. -->
# system.health

Is the application up?

**Who may call:** anyone.

**Budget:** p95 50ms.

## Payload

(none)

## Answer

| field | value |
|---|---|
| status | Ok |

## Refusals

(none)

## How to call

```sh
acme system health
```

HTTP: `POST /system/health` with the payload as JSON. SDK: `Sdk.system.health(payload)`.
