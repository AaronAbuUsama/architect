# journeys

Runs a project's journeys against a local world. `Journeys.load(root, model)` imports the declarations by path (the
same objects the journeys import), every `blueprint/journeys/*.ts` (the docs' place) and `journeys/*.ts`, and every `blueprint/starting-worlds/*.ts`. `Journeys.run`
casts the journey's people (named per journey, so two journeys never share a person), makes the starting world by its
declared calls, then calls each step as its cast member with a fresh `traceparent`. Every call is recorded with its
trace, its journal entries and `mayCall`, decided beforehand from the world's facts and the declaration's `allowed`
(through target-effect's own `Access.check`, over facts read back from the world). A step's checks run as soon as its
call returns, except span checks, which wait for telemetry. Test: `journeys.test.ts`.
