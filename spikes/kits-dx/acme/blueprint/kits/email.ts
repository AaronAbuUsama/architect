// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
// Written by `architect add kit @architect/kit-email`. No operations: the Mail dependency, the delivery thing, and the
// /resend inbound entry that records bounces. Nothing appears in the SDK, the CLI or MCP.
import { Blueprint } from "@architect/blueprint";
import email from "@architect/kit-email";

export default Blueprint.use(email, {});
