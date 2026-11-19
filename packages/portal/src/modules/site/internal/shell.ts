// The routes under `/portal`: each reads what it needs (the window, the snapshot) and hands the pages module the data to draw.
// The pages (React, and so JSX) load on first use, so a host that only reads the wire (the generator, the CLI, which run as plain
// Node) never loads them or `@orthograph/portal-ui`.
import { Effect } from "effect";
import { referenceKinds, type PageData, type PagesApi } from "#modules/pages/types.js";
import { Snapshot } from "#modules/snapshot/service.js";
import { Window } from "#modules/window/service.js";
import type { PortalContext } from "../types.ts";
import { html } from "./html.ts";

export const CSS_PATH = "/_portal/v1/portal.css";

/** Draw a page: load the pages once, then give them to `draw`. */
export const draw = (draw: (pages: PagesApi) => string, status = 200): Effect.Effect<Response> =>
  Effect.promise(() => import("#modules/pages/service.js")).pipe(Effect.map((m) => html(draw(m.Pages), status)));

/** A name in a path: declared names are lowercase words with dots and dashes, so anything else cannot name one. */
const NAME = /^[a-z0-9][a-z0-9.-]*$/;
const TRACE = /^[0-9a-zA-Z-]{8,64}$/;
const decode = (segment: string): string =>
  Effect.runSync(Effect.try({ try: () => decodeURIComponent(segment), catch: () => "" }).pipe(Effect.catch(() => Effect.succeed(""))));
const nameIn = (segment: string): string | undefined => { const name = decode(segment); return NAME.test(name) ? name : undefined; };

/** The window's view, or none: a source that cannot be read gives a page with no numbers, never a failed page and never a guess. */
const dataOf = (context: PortalContext): Effect.Effect<PageData> => {
  const { blueprint, live } = context;
  const base = { blueprint, css: CSS_PATH };
  return live === undefined
    ? Effect.succeed({ ...base, view: undefined })
    : Window.read(live, (operation) => blueprint.model.operations[operation]?.thing).pipe(
        Effect.map((view) => ({ ...base, view })),
        Effect.catch(() => Effect.succeed({ ...base, view: undefined })),
      );
};

const snapshotOf = (context: PortalContext) =>
  Snapshot.take({ blueprint: context.blueprint, reader: context.reader, bundleRevision: context.bundleRevision, ...(context.ref === undefined ? {} : { ref: context.ref }) });

export const notFound = (context: PortalContext): Effect.Effect<Response> => dataOf(context).pipe(Effect.flatMap((data) => draw((p) => p.notFound(data), 404)));

export const shell = (context: PortalContext, url: URL): Effect.Effect<Response> => {
  const { blueprint, live } = context;
  const parts = url.pathname.replace(/\/+$/, "").split("/").slice(1);
  const [, section, rest] = parts;
  const thing = section === "things" && rest !== undefined ? nameIn(rest) : undefined;
  const operation = section === "operations" && rest !== undefined ? nameIn(rest) : undefined;
  const found = { thing: thing === undefined ? undefined : blueprint.model.things[thing], operation: operation === undefined ? undefined : blueprint.model.operations[operation] };
  if (parts.length === 1) return Effect.all({ data: dataOf(context), snapshot: snapshotOf(context) }).pipe(Effect.flatMap(({ data, snapshot }) => draw((p) => p.home(data, snapshot))));
  if (parts.length === 3 && found.thing !== undefined) { const t = found.thing; return dataOf(context).pipe(Effect.flatMap((data) => draw((p) => p.thing(data, t)))); }
  if (parts.length === 3 && found.operation !== undefined) { const o = found.operation; return Effect.all({ data: dataOf(context), snapshot: snapshotOf(context) }).pipe(Effect.flatMap(({ data, snapshot }) => draw((p) => p.operation(data, snapshot, o)))); }
  if (parts.length === 2 && section === "journeys") return dataOf(context).pipe(Effect.flatMap((data) => draw((p) => p.journeys(data))));
  const kind = parts.length === 3 && section === "reference" ? referenceKinds.find((k) => k === rest) : undefined;
  if (kind !== undefined) return dataOf(context).pipe(Effect.flatMap((data) => draw((p) => p.reference(data, kind))));
  const id = parts.length === 3 && section === "traces" && rest !== undefined ? decode(rest) : "";
  if (live !== undefined && TRACE.test(id)) {
    return live.source.find(id).pipe(
      Effect.flatMap((trace) => (trace === undefined ? notFound(context) : dataOf(context).pipe(Effect.flatMap((data) => draw((p) => p.trace(data, id, trace)))))),
    );
  }
  return notFound(context);
};
