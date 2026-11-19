import { Effect } from "effect";
import { callsOf } from "./internal/metrics.ts";
import { eventsOf, journeyOf, lastCallOf, movesOf } from "./internal/traces.ts";
import type { JourneyRun, LastCall, WindowApi, WindowTrace } from "./types.ts";

const count = (into: Record<string, number>, key: string): void => { into[key] = (into[key] ?? 0) + 1; };

export const Window: WindowApi = {
  read: (live, thingOf) =>
    Effect.all({ traces: live.source.window(live.windowMs, live.now), points: live.metrics.window(live.windowMs, live.now) }).pipe(
      Effect.map(({ traces, points }) => {
        const { byOperation, refusals } = callsOf(points);
        const moves: Record<string, number> = {};
        const events: Record<string, number> = {};
        const journeysOf: Record<string, Array<string>> = {};
        const lastCalls: Array<LastCall> = [];
        const journeyRuns: Array<JourneyRun> = [];
        for (const [trace, found] of [...traces].toSorted(([a], [b]) => (a < b ? -1 : 1)) as Array<[string, WindowTrace]>) {
          const call = lastCallOf(trace, found);
          if (call !== undefined) lastCalls.push(call);
          for (const { operation, move } of movesOf(found)) {
            const thing = thingOf(operation);
            if (thing !== undefined) count(moves, `${thing}.${move}`);
          }
          for (const event of eventsOf(found)) count(events, event);
          const run = journeyOf(trace, found);
          if (run !== undefined) {
            journeyRuns.push(run);
            for (const step of run.steps) {
              const list = journeysOf[step.operation] ?? [];
              if (!list.includes(run.journey)) journeysOf[step.operation] = [...list, run.journey];
            }
          }
        }
        return {
          environment: live.environment,
          windowMs: live.windowMs,
          byOperation,
          lastCalls: lastCalls.toSorted((a, b) => b.start - a.start || (a.trace < b.trace ? -1 : 1)),
          moves,
          journeysOf,
          refusals,
          events,
          journeyRuns,
        };
      }),
    ),
};
