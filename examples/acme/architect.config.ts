import { Auth, Blueprint } from "@architect/blueprint";

export default Blueprint.config({
  name: "acme",
  // The standard outputs. Rename any here; the folders follow.
  outputs: { server: true, api: true, sdk: "@acme/sdk", cli: "acme", docs: true, mcp: true, portal: true },
  auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true, oauthProvider: true }), // agents sign in to the MCP server
});
