<!-- Generated from the blueprint. Do not edit. -->
# mission

A goal: milestones of tasks over the blueprint, taken as far as one environment.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| owner | person.id |
| title | Title |
| target | Environment |
| blueprint | Digest |

## Machine

States: intake, running, paused, done, stopped. A move from the wrong state is refused MissionNotIntake (exit 50).

| move | from | to | emits |
|---|---|---|---|
| open | (creates) | intake | MissionOpened |
| start | intake | running | MissionStarted |
| pause | running | paused | MissionPaused |
| resume | paused | running | MissionResumed |
| finish | running | done | MissionFinished |
| stop | intake, running, paused | stopped | MissionStopped |

## Roles

- owner

## Operations

- [mission.finish](finish.md): Close the mission: every task is closed by a fact up to its target.
- [mission.get](get.md): Read one mission by its id: owner, title, target, blueprint, state.
- [mission.list](list.md): List missions, newest first, 20 to a page, filtered by owner, state.
- [mission.open](open.md): Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps.
- [mission.pause](pause.md): Pause the mission, saying why.
- [mission.resume](resume.md): Pick a paused mission up again.
- [mission.start](start.md): Start the mission once intake is done. From here the manager only orchestrates.
- [mission.stop](stop.md): Stop the mission for good. Its runs are stopped with it.
- [mission.tasks](tasks.md): The mission's tasks, each in the column its facts put it in.
