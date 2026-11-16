import { Blueprint } from "@architect/blueprint";
import { Organization } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Organization, {
  states: ["active"],
  moves: { create: { from: [], to: "active", emits: Events.OrganizationCreated } },
  notFrom: { exit: 20 },
});
