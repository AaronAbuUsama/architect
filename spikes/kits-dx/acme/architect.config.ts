// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
// Changed: `auth` is gone from the config. Sign-in is the auth kit, mounted in blueprint/kits/auth.ts.
import { Blueprint } from "@architect/blueprint";

export default Blueprint.config({
  name: "acme",
  outputs: { server: true, api: true, sdk: "@acme/sdk", cli: "acme", docs: true, mcp: true, portal: true },
});
