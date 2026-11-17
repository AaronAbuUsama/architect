<!-- Generated from the blueprint. Do not edit. -->
# mission.resume

Pick a paused mission up again.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | mission.id |

## Answer

(none)

## Move

`resume`: from paused to running, emitting MissionResumed.

## Steps

- `mission.resume.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionNotIntake | 50 | MS-900 | the mission is in a state resume can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work mission resume --mission <mission>
```

HTTP: `POST /mission/resume` with the payload as JSON. SDK: `Sdk.mission.resume(payload)`.
