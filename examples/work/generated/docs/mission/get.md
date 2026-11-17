<!-- Generated from the blueprint. Do not edit. -->
# mission.get

Read one mission by its id: owner, title, target, blueprint, state.

**Who may call:** the owner of the mission.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | mission.id |

## Answer

| field | value |
|---|---|
| owner | mission.owner |
| title | mission.title |
| target | mission.target |
| blueprint | mission.blueprint |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of the mission; the handler never runs |

## How to call

```sh
work mission get --id <id>
```

HTTP: `POST /mission/get` with the payload as JSON. SDK: `Sdk.mission.get(payload)`.
