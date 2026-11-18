# Portal actions

The local Vite server exposes validated template actions to the portal, its sandboxed extensions and local agents.
The CLI and browser call the same registry. `view-screen` reads semantic context from an open tab, and `navigate`
sends one command to the intended tab. The state only lives while the local server is running.

Action definitions use `defineAction` with Effect input and output schemas and exposure flags. Register feature
actions in `vite.config.ts`, following `actions/read-proof.ts`. Approval-gated actions fail closed until the
template has an approval host. Orthograph's Worker remains the MCP entry point for blueprint operations.
