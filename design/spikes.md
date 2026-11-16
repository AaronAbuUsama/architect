# Spikes

Each spike answers one question in throwaway code. Full write-ups, with every file, are in `spikes/`.

## Done (16 November 2026)

1. **A thing as a Durable Object, with its world** (`spikes/durable-object.md`): **yes, with a generated lock.**
   Durable Object input gates stop a race only while the move never awaits; with a wait mid-move (as a chain call
   would be), two spends both landed and one was lost. An Effect `Semaphore` of one permit around every move fixed it,
   at no measurable cost (about 7 ms a spend locally). The world's versioned index answered every cross-thing read
   correctly. Needs it named: an outbox from thing to index, retried by alarm; an in-between state for chain calls;
   a timeout on the permit; an index per organisation under load.
2. **The clock and the world's controller** (`spikes/world-clock.md`): **yes.** A year in 50 to 81 ms of real time,
   ten identical runs; Effect's clock, timers, a durable sleep and Anvil agreed to the millisecond. Three rules: all
   work is counted work (quiescence is a service; TestClock alone can't see a fiber waiting on I/O); plain sleeps are
   banned in handlers by lint; Anvil runs with timestamp interval 0 and whole seconds. Found a real bug: periods need
   an anchor (decided: calendar months from the grant).
3. **Names from paths** (`spikes/names-from-paths.md`): **yes.** A compiler loads each declaration by path and writes
   the only copy of each name into `generated/`; mapped types give typed handler slots, routes, client and CLI; a typo,
   an undeclared field and an undeclared error don't compile; renaming a file renames the operation everywhere.
   Errors are named by their exported class, narrowed by module augmentation. Limits: blueprint files must have no
   side effects on import; the compiler runs before `tsc`; dashed file names are mapped to identifiers (decided).

## Still to run, before layer one (steps S2 to S6 in `build-plan.md`)

4. **One declaration through the whole chain:** declaration, model, HttpApi route, handler, SDK call, CLI command,
   with a span.
5. **The move without races in D1:** the version-column half (the Durable Object half is answered above).
6. **Evals from telemetry:** three evals over an in-memory trace exporter, each failing on a planted bad call.
7. **Nx scaffolds and outputs:** a scaffold that writes once, a sync generator that fails `nx sync:check` on drift, a preset.
8. **Lint rules:** a declared name as a string; a refusal with no deciding log; and, from the clock spike, a plain sleep.

Optional: the machine in Solidity with its Foundry tests (de-risks layer four); reading @prb/effect-evm's source to
confirm which modules to adapt.
