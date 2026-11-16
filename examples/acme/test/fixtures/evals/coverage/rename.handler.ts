// Planted fixture: the handler for organization.rename, at implementation/handlers/organization/rename.ts.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/organization/rename.handler.ts";

const rename: Handler = (payload, _context) => Effect.succeed({ organization: payload.organization });

export default rename;
