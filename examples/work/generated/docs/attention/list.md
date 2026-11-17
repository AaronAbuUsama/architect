<!-- Generated from the blueprint. Do not edit. -->
# attention.list

List attentions, newest first, 50 to a page, filtered by mission, state.

**Who may call:** the owner of its mission.

**A read:** answered from the records, with no handler. A page of 50 at a time, newest first, narrowed by mission, state; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| mission (optional) | attention.mission |
| state (optional) | text |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work attention list [--mission <mission>] [--state <state>] [--cursor <cursor>]
```

HTTP: `POST /attention/list` with the payload as JSON. SDK: `Sdk.attention.list(payload)`.
