<!-- Generated from the blueprint. Do not edit. -->
# mission.list

List missions, newest first, 20 to a page, filtered by owner, state.

**Who may call:** anyone signed in.

**A read:** answered from the records, with no handler. A page of 20 at a time, newest first, narrowed by owner, state; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| owner (optional) | mission.owner |
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
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
work mission list [--owner <owner>] [--state <state>] [--cursor <cursor>]
```

HTTP: `POST /mission/list` with the payload as JSON. SDK: `Sdk.mission.list(payload)`.
