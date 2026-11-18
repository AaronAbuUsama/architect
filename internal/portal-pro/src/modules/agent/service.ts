import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Effect, Schema } from "effect";
import type { Plugin } from "vite";
import type { ExtensionManifest } from "../extension-host/types.ts";
import type { Capture, OperationsBlueprint } from "../operations/types.ts";
import { actions, isPortalPath } from "./internal/actions.ts";
import { ActionRefused, Screen, type Action, type ActionContext, type ActiveScreen } from "./types.ts";

export { defineAction } from "./internal/actions.ts";

const base = "/__portal/agent";
const validTab = (id: string | null): id is string => Boolean(id && /^[a-f0-9-]{36}$/u.test(id));
const localHost = /^(127\.0\.0\.1|localhost)(:\d+)?$/u;
const loopback = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value, (_, item: unknown) => typeof item === "bigint" ? item.toString() : item));
};

const readBody = (request: IncomingMessage, limit = 16_384) => Effect.callback<unknown, ActionRefused>((resume) => {
  let body = "";
  let tooLarge = false;
  request.setEncoding("utf8");
  request.on("data", (chunk: string) => {
    if (tooLarge) return;
    body += chunk;
    if (body.length > limit) {
      tooLarge = true;
      resume(Effect.fail(new ActionRefused({ status: 413, message: "The action input is too large." })));
    }
  });
  request.once("error", () => resume(Effect.fail(new ActionRefused({ status: 400, message: "The action input could not be read." }))));
  request.once("end", () => {
    if (tooLarge) return;
    resume(Effect.try({
      try: () => JSON.parse(body) as unknown,
      catch: () => new ActionRefused({ status: 400, message: "Send a valid JSON input." }),
    }));
  });
});

export const portalAgent = (blueprint: OperationsBlueprint, capturePath: string, extensionRoot: string,
  appActions: Readonly<Record<string, Action>>): Plugin => {
  const registry = { ...appActions, ...actions };
  const tabs = new Map<string, ActiveScreen>();
  const feeds = new Map<string, ServerResponse>();

  const getCapture = () => {
    if (!existsSync(capturePath)) return undefined;
    const capture = JSON.parse(readFileSync(capturePath, "utf8")) as Capture;
    return capture.blueprintDigest === blueprint.digest ? capture : undefined;
  };

  const context = (includeCapture: boolean): ActionContext => ({
    blueprint,
    capture: includeCapture ? getCapture() : undefined,
    extensions: existsSync(extensionRoot) ? readdirSync(extensionRoot, { withFileTypes: true }).flatMap((folder) => {
      if (!folder.isDirectory()) return [];
      const manifest = join(extensionRoot, folder.name, "extension.json");
      return existsSync(manifest) && existsSync(join(extensionRoot, folder.name, "index.html"))
        ? [JSON.parse(readFileSync(manifest, "utf8")) as ExtensionManifest] : [];
    }) : [],
    screen: (tabId) => tabId
      ? (feeds.has(tabId) ? tabs.get(tabId) : undefined)
      : [...tabs.values()].findLast((tab) => feeds.has(tab.tabId)),
    navigate: (tabId, path) => {
      const feed = feeds.get(tabId);
      if (!feed || feed.destroyed) return false;
      feed.write(`data: ${JSON.stringify({ path })}\n\n`);
      return true;
    },
  });

  const middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (/^\/extensions\/[a-z][a-z0-9-]*\/index\.html$/u.test(url.pathname) && !url.searchParams.has("raw")) {
      return json(response, 404, { error: "Open this extension through its sandboxed portal page." });
    }
    if (!url.pathname.startsWith(`${base}/`)) return next();
    const host = request.headers.host ?? "";
    const origin = request.headers.origin;
    if (!loopback.has(request.socket.remoteAddress ?? "") || !localHost.test(host) || (origin && origin !== `http://${host}`)) {
      return json(response, 403, { error: "Portal actions require the local portal origin." });
    }

    const endpoint = url.pathname.slice(base.length);
    const tabId = url.searchParams.get("tab");
    if (endpoint === "/events" && request.method === "GET" && validTab(tabId)) {
      feeds.get(tabId)?.end();
      feeds.set(tabId, response);
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      response.write(": portal connected\n\n");
      response.once("close", () => {
        if (feeds.get(tabId) !== response) return;
        feeds.delete(tabId);
        tabs.delete(tabId);
      });
      return;
    }
    if (endpoint === "/actions" && request.method === "GET") {
      return json(response, 200, { actions: Object.entries(registry).filter(([, action]) => action.manifest.agentTool)
        .map(([name, action]) => ({ name, ...action.manifest })) });
    }
    if (request.method !== "POST" || request.headers["content-type"]?.split(";", 1)[0] !== "application/json") {
      return json(response, 415, { error: "Send JSON to a portal action." });
    }

    const dispatch = Effect.gen(function* () {
      if (endpoint === "/state" && validTab(tabId)) {
        const screen = yield* Schema.decodeUnknownEffect(Screen)(yield* readBody(request));
        if (!isPortalPath(screen.path, context(false))) return yield* new ActionRefused({ status: 400, message: "Unknown portal screen." });
        tabs.delete(tabId);
        tabs.set(tabId, { tabId, screen });
        if (tabs.size > 32) tabs.delete(tabs.keys().next().value!);
        return { ok: true };
      }
      const actionName = endpoint.startsWith("/actions/") ? endpoint.slice(9) : "";
      if (!Object.hasOwn(registry, actionName)) return yield* new ActionRefused({ status: 404, message: "Unknown portal action." });
      const action = registry[actionName]!;
      const workspaceWrite = !action.manifest.readOnly && !action.manifest.agentTool;
      if (workspaceWrite && (request.headers["x-portal-ui"] !== "workspace" || origin !== `http://${host}`)) {
        return yield* new ActionRefused({ status: 403, message: "Save page notes from the workspace editor." });
      }
      return yield* action.run(yield* readBody(request, workspaceWrite ? 500_000 : undefined),
        context(actionName !== "navigate" && actionName !== "view-screen"));
    });
    void Effect.runPromise(Effect.match(dispatch, {
      onSuccess: (value) => json(response, 200, value),
      onFailure: (error) => error instanceof ActionRefused
        ? json(response, error.status, { error: error.message })
        : json(response, 400, { error: "The input did not match the action schema." }),
    })).catch(() => json(response, 500, { error: "The portal action could not complete." }));
  };

  return {
    name: "orthograph-portal-agent",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
};
