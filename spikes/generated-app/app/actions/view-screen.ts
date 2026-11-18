import { defineAction } from "@agent-native/core/action";
import { readAppState, readAppStateForCurrentTab } from "@agent-native/core/application-state";
import { z } from "zod";
import { actingAs } from "../server/forman/acme.ts";
import { drawPage, findPage } from "../server/forman/draw.ts";

// What the chat sees on every turn as <current-screen>: the route, who the app calls acme as, and, on a page of the
// project's app, a short form of what that page shows (its live numbers, latest calls, the open trace). The full page
// is one `read-page` away.
const brief = (page: Awaited<ReturnType<typeof drawPage>>) => {
  if (!page || !("blocks" in page)) return page;
  const live = (show: string) => (page.blocks as Array<{ block: string; show?: string; data?: unknown }>).find((b) => b.block === "Live" && b.show === show)?.data;
  const calls = live("calls") as { series?: unknown } | undefined;
  const recent = live("recent") as Array<Record<string, unknown>> | undefined;
  const trace = live("trace") as { trace?: string; call?: unknown; calledAs?: unknown } | undefined;
  return {
    title: page.title, kind: page.kind, about: page.about, scope: page.scope,
    ...(calls ? { calls: { ...calls, series: undefined } } : {}),
    ...(recent ? { recentCalls: recent.slice(0, 6).map((c) => ({ trace: c.trace, outcome: c.outcome, refusal: c.refusal, calledAs: c.calledAs, person: c.person, at: c.at })) } : {}),
    ...(trace ? { openTrace: { id: trace.trace, call: trace.call, appCall: trace.calledAs } } : {}),
    more: `read-page {"path":"${page.path}"} for every block`,
  };
};

export default defineAction({
  description:
    "Read what the app's screen shows now: the route, who the app calls acme as, and on a page of the project's app a short form of its live numbers, latest calls and open trace. Basic navigation is already included in <current-screen>; use this action only when you need a fresh read.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");
    const selection = (await readAppStateForCurrentTab("forman-screen", { fallbackToGlobal: true })) as { path?: string; trace?: string; windowMin?: number } | null;
    const path = selection?.path ?? (navigation?.["path"] as string | undefined);
    const screen: Record<string, unknown> = { actingAs: (await actingAs()) ?? "nobody" };
    if (navigation) screen.navigation = navigation;
    if (path && (findPage(path) || path.startsWith("/orphans/"))) {
      screen.page = brief(await drawPage(path, { windowMin: selection?.windowMin ?? 30, trace: selection?.trace }, Date.now()));
    }
    return screen;
  },
});
