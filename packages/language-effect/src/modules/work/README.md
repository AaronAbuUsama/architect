# work

`Busy`, counted work. Every handler, workflow and keeper job runs as counted work, so a world can wait until it is
quiet before it moves its clock. The clock spike (`design/spikes/world-clock.md`) showed why: Effect's `TestClock`
can't see a fiber waiting on I/O, so quiet has to be counted, not inferred. `BusyLive` counts inside one process.
