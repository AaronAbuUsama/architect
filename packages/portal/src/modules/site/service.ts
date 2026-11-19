import { Effect } from "effect";
import { Reader } from "#modules/reader/service.js";
import { Snapshot } from "#modules/snapshot/service.js";
import { Wire } from "#modules/wire/service.js";
import type { BlueprintRejected, BlueprintWire } from "#modules/wire/types.js";
import type { PortalContext, PortalEnv, SiteApi } from "./types.ts";
import { CSS_PATH, shell } from "./internal/shell.ts";
import { esc, html, page } from "./internal/html.ts";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

const owns = (path: string) => path === "/portal" || path.startsWith("/portal/") || path === "/_portal" || path.startsWith("/_portal/");

const notFound = () => json({ _tag: "NotFound" }, 404);

const data = (context: PortalContext, url: URL, request: Request): Effect.Effect<Response> => {
  const { blueprint } = context;
  if (url.pathname === "/_portal/v1/blueprint") {
    const etag = `"${blueprint.digest}"`;
    return Effect.succeed(request.headers.get("if-none-match") === etag
      ? new Response(null, { status: 304, headers: { etag } })
      : json(blueprint, 200, { etag, "cache-control": "no-cache" }));
  }
  if (url.pathname === "/_portal/v1/snapshot") {
    const asked = url.searchParams.get("digest");
    if (asked === null) return Effect.succeed(json({ _tag: "BadRequest", reason: "a snapshot is for one blueprint: pass its digest" }, 400));
    if (asked !== blueprint.digest) return Effect.succeed(json({ _tag: "BlueprintChanged", digest: blueprint.digest }, 409));
    return Snapshot.take({ blueprint, reader: context.reader, bundleRevision: context.bundleRevision, ...(context.ref === undefined ? {} : { ref: context.ref }) }).pipe(Effect.map((s) => json(s)));
  }
  if (url.pathname === CSS_PATH) {
    const css = context.css !== undefined ? Effect.succeed(context.css) : Effect.promise(() => import("@orthograph/portal-ui")).pipe(Effect.flatMap((m) => m.Styles.css));
    return css.pipe(
      Effect.map((css) => new Response(css, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache" } })),
      Effect.catch((error) => Effect.succeed(json({ _tag: "StylesUnavailable", reason: error.reason }, 503))),
    );
  }
  return Effect.succeed(notFound());
};

const handle: SiteApi["handle"] = (context, request) => {
  const url = new URL(request.url);
  const isData = url.pathname.startsWith("/_portal/");
  if (request.method !== "GET" && request.method !== "HEAD") {
    return Effect.succeed(isData ? json({ _tag: "MethodNotAllowed" }, 405, { allow: "GET, HEAD" }) : new Response("method not allowed", { status: 405, headers: { allow: "GET, HEAD" } }));
  }
  return isData ? data(context, url, request) : shell(context, url);
};

/** The decoded blueprint of a generated JSON module, once: the same object is the same blueprint. */
const decoded = new WeakMap<object, { readonly ok: true; readonly blueprint: BlueprintWire } | { readonly ok: false; readonly error: BlueprintRejected }>();

const accept = (json: unknown) => {
  if (typeof json !== "object" || json === null) return Effect.runSync(Wire.decode(json).pipe(Effect.map((blueprint) => ({ ok: true as const, blueprint })), Effect.catch((error) => Effect.succeed({ ok: false as const, error }))));
  const held = decoded.get(json);
  if (held) return held;
  const made = Effect.runSync(Wire.decode(json).pipe(Effect.map((blueprint) => ({ ok: true as const, blueprint })), Effect.catch((error) => Effect.succeed({ ok: false as const, error }))));
  decoded.set(json, made);
  return made;
};

const serve: SiteApi["serve"] = (blueprint, request, env: PortalEnv) => {
  const accepted = accept(blueprint);
  if (!accepted.ok) {
    const reason = accepted.error.reason;
    const isData = new URL(request.url).pathname.startsWith("/_portal/");
    return Effect.succeed(isData ? json({ _tag: "BlueprintRejected", reason }, 500) : html(page("portal", `<h1>This portal's blueprint was rejected</h1><p>${esc(reason)}</p>`), 500));
  }
  const logbook = env.ORTHO_LOGBOOK_URL;
  return handle({ blueprint: accepted.blueprint, reader: logbook ? Reader.http(logbook) : null, bundleRevision: env.ORTHO_REVISION ?? null }, request);
};

export const Portal: SiteApi = { owns, handle, serve };
