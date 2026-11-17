# timers

`Timers`, the one way anything waits: `at` (fire work at an instant) and `sleep` (a durable sleep that gives its
counted-work token back while parked). The world's clock driver asks `due`, moves the clock, then `fire`s. Plain
`Effect.sleep` is banned in handlers by lint (L1.40). `TimersMemory` keeps the table in memory; stage five puts it in
the world's Durable Object, where `at` becomes an alarm.
