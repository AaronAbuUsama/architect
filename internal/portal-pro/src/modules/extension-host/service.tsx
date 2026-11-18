import { useEffect, useRef } from "react";
import type { ScreenContext } from "../agent/types.ts";
import { extensionBridge } from "./internal/bridge.ts";
import type { ExtensionManifest, ExtensionSlotName } from "./types.ts";

const manifests = import.meta.glob<ExtensionManifest>("../../../extensions/*/extension.json", { eager: true, import: "default" });
const entries = import.meta.glob<string>("../../../extensions/*/index.html", { eager: true, import: "default", query: "?raw" });
const extensions = Object.entries(manifests).flatMap(([path, manifest]) => {
  const entry = entries[path.replace("extension.json", manifest.entry)];
  return entry ? [{ manifest, entry }] : [];
});

const base = "/__portal/agent";
const jsonHeaders = { "Content-Type": "application/json" };
const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'">`;

export const appAction = <Result,>(name: string, input: unknown, workspace?: "workspace"): Promise<Result> =>
  fetch(`${base}/actions/${encodeURIComponent(name)}`, { method: "POST", headers: { ...jsonHeaders, ...(workspace && { "X-Portal-UI": workspace }) }, body: JSON.stringify(input) })
    .then((response) => response.json().then((body: Result & { error?: string }) =>
      response.ok ? body : Promise.reject(new Error(body.error ?? "The portal action could not complete."))));

const tabId = () => {
  const key = "orthograph-portal-tab";
  const id = sessionStorage.getItem(key) ?? crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
};

export const usePortalScreen = (screen: ScreenContext) => {
  const state = JSON.stringify(screen);
  useEffect(() => {
    const id = tabId();
    const events = new EventSource(`${base}/events?tab=${id}`);
    events.onmessage = (event) => {
      const { path } = JSON.parse(event.data) as { path?: string };
      if (path?.startsWith("/") && !path.startsWith("//")) window.location.assign(path);
    };
    return () => events.close();
  }, []);
  useEffect(() => {
    const publish = () => {
      void fetch(`${base}/state?tab=${tabId()}`, { method: "POST", headers: jsonHeaders, body: state }).catch(() => undefined);
    };
    publish();
    window.addEventListener("focus", publish);
    return () => window.removeEventListener("focus", publish);
  }, [state]);
};

const ExtensionFrame = ({ manifest, entry, context }: { manifest: ExtensionManifest; entry: string; context: ScreenContext }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const serialized = JSON.stringify(context);
  const postContext = () => frame.current?.contentWindow?.postMessage({ type: "portal-context", context }, "*");

  useEffect(() => {
    const message = (event: MessageEvent) => {
      if (event.origin !== "null" || event.source !== frame.current?.contentWindow) return;
      const message = event.data as { type?: unknown; id?: unknown; name?: unknown; input?: unknown } | null;
      if (message?.type !== "portal-action" || typeof message.id !== "number" || typeof message.name !== "string") return;
      const source = frame.current?.contentWindow;
      const respond = (result: { value?: unknown; error?: string }) => {
        source?.postMessage({ type: "portal-action-result", id: message.id, ...result }, "*");
      };
      if (!manifest.permissions.appActions.includes(message.name)) {
        respond({ error: "This extension does not have permission to call that action." });
        return;
      }
      const input = message.input && typeof message.input === "object" && !Array.isArray(message.input)
        ? { ...message.input, tabId: tabId() } : message.input;
      void appAction(message.name, input).then(
        (value) => respond({ value }), (error: Error) => respond({ error: error.message }),
      );
    };
    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  }, [manifest]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "portal-context", context: JSON.parse(serialized) }, "*");
  }, [serialized]);

  return <iframe ref={frame} sandbox="allow-scripts" title={manifest.name} onLoad={postContext}
    srcDoc={`<!doctype html><meta charset="utf-8">${csp}${extensionBridge}${entry}`}
    style={{ display: "block", width: "100%", minHeight: 100, border: 0, marginBlock: 8 }} />;
};

export const ExtensionSlot = ({ name, context }: { name: ExtensionSlotName; context: ScreenContext }) => (
  <>{extensions.filter(({ manifest }) => manifest.slots.includes(name)).map(({ manifest, entry }) =>
    <ExtensionFrame key={manifest.id} manifest={manifest} entry={entry} context={context} />)}</>
);

export const ExtensionGallery = ({ id, context }: { id?: string | undefined; context: ScreenContext }) => {
  const current = extensions.find(({ manifest }) => manifest.id === id);
  if (id && !current) return <p>Extension not found. <a href="/extensions">View extensions</a></p>;
  if (current) return <>
    <p className="op-back"><a href="/extensions">‹ Extensions</a></p>
    <h1 className="text-2xl font-semibold">{current.manifest.name}</h1>
    <ExtensionFrame {...current} context={context} />
  </>;
  return <>
    <h1 className="text-2xl font-semibold">Extensions</h1>
    <ul className="mt-4 list-inside list-disc">
      {extensions.map(({ manifest }) => <li key={manifest.id}>
        <a className="underline" href={`/extensions/${manifest.id}`}>{manifest.name}</a>
        <span className="ml-2 text-muted">{manifest.description}</span>
      </li>)}
    </ul>
  </>;
};
