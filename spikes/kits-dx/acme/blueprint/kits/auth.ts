// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
import { Blueprint } from "@architect/blueprint";
import auth from "@architect/kit-auth";

// Sign-in: people, sessions, API keys, the CLI's device login, OAuth for agents on MCP. Today's config.auth, moved.
export default Blueprint.use(auth, { choices: { apiKeys: true, deviceLogin: true, oauthProvider: true } });
