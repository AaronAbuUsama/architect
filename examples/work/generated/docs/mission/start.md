<!-- Generated from the blueprint. Do not edit. -->
# mission.start

Start the mission once intake is done. From here the manager only orchestrates.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | mission.id |

## Answer

(none)

## Move

`start`: from intake to running, emitting MissionStarted.

## Steps

- `mission.start.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionHasOpenQuestions | 51 | MS-001 | declared in errors.ts, carrying open |
| MissionNotIntake | 50 | MS-900 | the mission is in a state start can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work mission start --mission <mission>
```

HTTP: `POST /mission/start` with the payload as JSON. SDK: `Sdk.mission.start(payload)`.
