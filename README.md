# Architect

Architect is Effect, one level up. You declare what a system is: its things and their state machines, the events each
change emits, the errors, the steps and telemetry, who may call each operation, budgets, environments and dependencies.
Architect generates the rest: the server, the API, the SDK, the CLI, the MCP server, the docs, the infrastructure and,
for things that live on chain, the Solidity. It scaffolds blanks where behaviour goes, for agents to fill. Built-in
evals prove every operation from its telemetry, in every environment.

This repository starts empty apart from its design. Start here:

1. `KICKOFF.md`: what the first session does.
2. `AGENTS.md`: the rules every agent keeps.
3. `design/`: the decisions, the build plan, the packages, the spikes, and the design docs (`design/docs/index.html`,
   open it in a browser).
