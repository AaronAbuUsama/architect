import { Blueprint } from "@formants/forman";
import { Mission } from "./thing.ts";

// The person whose mission it is. The manager and the runs act for them, through their API key or MCP sign-in, so today
// they hold this role too. Stop and the attention answers should be the person alone (F4 8.10; open in F5 §4).
export const owner = Blueprint.role(Mission, { rule: (mission, principal) => mission.owner === principal.person });
