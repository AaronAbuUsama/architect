// `/portal` and under it: the prebuilt client's files, from the Worker's static assets. A file is served as it is; a route (a path with no
// file type: `/portal/operations/handle.claim` ends in a name, not a type) is the client's shell, which draws the page itself.
import { Effect } from "effect";
import type { PortalAssets } from "../types.ts";

const FILE = /\.(?:js|mjs|css|map|json|svg|png|ico|woff2?|txt|webmanifest)$/;

/** The path inside the client's folder: `/portal` is `/`, `/portal/assets/a.js` is `/assets/a.js`. */
const insideOf = (pathname: string): string => {
  const rest = pathname.slice("/portal".length);
  return rest === "" ? "/" : rest;
};

const notInstalled = () => new Response("The portal's client is not installed in this Worker: it has no static assets.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export const client = (assets: PortalAssets | undefined, request: Request): Effect.Effect<Response> => {
  if (assets === undefined) return Effect.succeed(notInstalled());
  const url = new URL(request.url);
  const inside = insideOf(url.pathname);
  const ask = (path: string) => Effect.promise(() => assets.fetch(new Request(new URL(path, url.origin), { method: request.method, headers: request.headers })));
  return ask(inside).pipe(
    Effect.flatMap((found) => (found.status === 404 && !FILE.test(inside) ? ask("/") : Effect.succeed(found))),
  );
};
