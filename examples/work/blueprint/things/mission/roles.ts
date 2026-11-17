import { Blueprint } from "@architect/blueprint";
import { Mission } from "./thing.ts";

// The person whose mission it is. The manager and the runs act for them, through their API key or MCP sign-in.
export const owner = Blueprint.role(Mission, { rule: (mission, principal) => mission.owner === principal.person });
