<!-- Generated from the blueprint. Do not edit. -->
# mission.finish

Close the mission: every task is closed by a fact up to its target.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | mission.id |

## Answer

(none)

## Move

`finish`: from running to done, emitting MissionFinished.

## Steps

- `mission.finish.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionNotIntake | 50 | MS-900 | the mission is in a state finish can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work mission finish --mission <mission>
```

HTTP: `POST /mission/finish` with the payload as JSON. SDK: `Sdk.mission.finish(payload)`.
