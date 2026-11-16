# world

`World`, the Durable Object that is one running world, and `toWorld`, which routes `/_world/*` to it. Stage one's
world keeps the cast (`POST /_world/cast` with `{ names }` gives each a person id, made once and kept in the world's
own SQLite storage, and a token signed with the run's secret) and answers `/_world/health`. The clock, the timers
table and the registry of things join it in stage five.
