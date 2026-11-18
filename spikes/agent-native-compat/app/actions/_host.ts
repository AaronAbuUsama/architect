// The agent-native app's own file (underscore: skipped by action discovery). Decides the request key per caller.
import type { Host } from "../../src/generated/proposal-vote.ts";
export const host: Host = {
  requestKey: (ctx) => (ctx?.toolCallId ? `tool:${ctx.toolCallId}` : undefined),
};
