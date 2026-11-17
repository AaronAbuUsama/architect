<!-- Generated from the blueprint. Do not edit. -->
# mission.stop

Stop the mission for good. Its runs are stopped with it.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | mission.id |
| why | Note |

## Answer

(none)

## Move

`stop`: from intake or running or paused to stopped, emitting MissionStopped.

## Steps

- `mission.stop.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionNotIntake | 50 | MS-900 | the mission is in a state stop can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work mission stop --mission <mission> --why <why>
```

HTTP: `POST /mission/stop` with the payload as JSON. SDK: `Sdk.mission.stop(payload)`.
