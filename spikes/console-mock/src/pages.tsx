import { Channels } from "./channels.tsx";
import { Dx } from "./dx.tsx";
import { Fleet } from "./fleet.tsx";
import { Mission } from "./mission.tsx";
import { Plan } from "./plan.tsx";
import { Worker } from "./worker.tsx";

export const pages: Record<string, { el: () => JSX.Element; title: string; height: number }> = {
  Main: { el: Mission, title: "Goal", height: 1600 },
  Plan: { el: Plan, title: "Plan", height: 1560 },
  Fleet: { el: Fleet, title: "Fleet health", height: 1300 },
  Worker: { el: Worker, title: "Worker", height: 1700 },
  Channels: { el: Channels, title: "Channels", height: 1300 },
  Dx: { el: Dx, title: "Developer view", height: 1900 },
};
