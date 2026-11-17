import { Auth, Blueprint } from "@formants/forman";

export default Blueprint.config({
  name: "work",
  // Missions, their questions, runs and what waits on you. The CLI is how a person drives it; the MCP server is the
  // manager's and the runs' tools; the portal's Work side reads it.
  outputs: { server: true, api: true, sdk: "@work/sdk", cli: "work", docs: true, mcp: true, portal: true },
  auth: Auth.betterAuth({ apiKeys: true, deviceLogin: true, oauthProvider: true }), // agents sign in to the MCP server
});
