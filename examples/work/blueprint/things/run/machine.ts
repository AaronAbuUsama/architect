import { Blueprint } from "@architect/blueprint";
import { Run } from "./thing.ts";
import * as Events from "./events.ts";

// A run's states say how the run is going. They never close its task: only a fact does (F4 8.4).
export const machine = Blueprint.machine(Run, {
  states: ["running", "waiting", "finished", "failed", "stopped"],
  moves: {
    start: { from: [], to: "running", emits: Events.RunStarted },
    report: { from: ["running", "waiting"], to: ["running", "waiting"], emits: Events.RunReported },
    finish: { from: ["running"], to: "finished", emits: Events.RunFinished }, // pushed a branch; CI proves it
    fail: { from: ["running", "waiting"], to: "failed", emits: Events.RunFailed },
    stop: { from: ["running", "waiting"], to: "stopped", emits: Events.RunStopped },
  },
  notFrom: { exit: 60 },
});
