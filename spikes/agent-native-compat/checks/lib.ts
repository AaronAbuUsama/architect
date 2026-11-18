// Boots agent-native's REAL action route (mountActionRoutes) on a bare h3 app, with the framework's default plugins
// (auth, org, agent-chat, ...) switched off through its own env switch and a PGlite database for its audit rows.
process.env.AGENT_NATIVE_DISABLED_PLUGINS = "agent-chat,auth,context-xray,core-routes,integrations,observational-memory,onboarding,org,resources,sentry,terminal";
process.env.DATABASE_URL = `pglite:${process.cwd()}/.pglite`;
import { H3 } from "h3";
import { mountActionRoutes } from "@agent-native/core/server";

export type Entries = Record<string, any>;

export const mount = (actions: Entries, owner: string | undefined = "alice@example.com") => {
  const h3 = new H3();
  const nitroApp: any = { h3, fetch: (r: Request) => h3.fetch(r), hooks: { hook() {}, callHook: async () => {} } };
  mountActionRoutes(nitroApp, actions as any, { getOwnerFromEvent: () => owner, appId: "spike" } as any);
  return async (name: string, body: unknown, headers: Record<string, string> = {}) => {
    const res = await h3.fetch(new Request(`http://app.local/_agent-native/actions/${name}`, {
      method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
    }));
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch {}
    return { status: res.status, body: parsed };
  };
};

import { executeAgentToolCall } from "@agent-native/core/server";

/**
 * The in-app agent's tool path, run through agent-native's REAL loop: `executeAgentToolCall` (dist/agent/production-agent.js:3838)
 * drives `runAgentLoop` with a stub engine that emits exactly one tool call and then stops, so no model is involved.
 */
export const agentToolCall = async (name: string, entries: Entries, args: unknown, extra: Record<string, unknown> = {}) => {
  const events: any[] = [];
  const result = await executeAgentToolCall({
    actions: entries as any, name, input: args, callId: "toolu_01ABC", ownerEmail: "alice@example.com", orgId: null,
    appId: "spike", threadId: "th_1", runId: "run_1", turnId: "turn_1", send: (e: any) => events.push(e), ...extra,
  } as any);
  const done = events.filter((e) => e.type === "tool_done").pop();
  const pick = done ? Object.fromEntries(Object.entries(done).filter(([k]) => ["isError", "errorCode", "errorClass", "outcomeUnknown", "completedSideEffect"].includes(k))) : {};
  return { status: result.status, output: result.output, ...pick, approvalKey: (result as any).approvalKey, approval: events.find((e) => e.type === "approval_required") ? "approval_required event" : undefined };
};
