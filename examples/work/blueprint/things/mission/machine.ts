import { Blueprint } from "@formants/forman";
import { Mission } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Mission, {
  states: ["intake", "running", "paused", "done", "stopped"],
  moves: {
    open: { from: [], to: "intake", emits: Events.MissionOpened }, // the manager asks its questions first (F4 8.6)
    start: { from: ["intake"], to: "running", emits: Events.MissionStarted }, // only when you press Start
    pause: { from: ["running"], to: "paused", emits: Events.MissionPaused }, // the day's share of the cap is spent
    resume: { from: ["paused"], to: "running", emits: Events.MissionResumed },
    finish: { from: ["running"], to: "done", emits: Events.MissionFinished }, // every task closed by a fact
    stop: { from: ["intake", "running", "paused"], to: "stopped", emits: Events.MissionStopped }, // a person's act
  },
  notFrom: { exit: 50 },
});
