# timers

`Timers`, the one way anything waits: `at` (fire work at an instant) and `sleep` (a durable sleep that gives its
counted-work token back while parked). `within` parks a counted port call until it
finishes or the timer interrupts it. The world's clock driver asks `due`, moves the clock, then `fire`s. Plain
`Effect.sleep` is banned in handlers by lint (L1.40). `TimersMemory` keeps the table in memory; stage five puts it in
the world's Durable Object, where `at` becomes an alarm.

`TimersLive` (M1.29) is the `Timers` of code that runs on a device or in a plain process, with no world to drive its clock: `sleep` waits on the real clock, and `at` (a timer to fire later) is a defect, since only a world can keep one. Also from `@orthograph/language-effect/device`.
