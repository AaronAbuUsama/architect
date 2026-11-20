// The portal's server half, as a route of an environment's Worker (K19): the data at `/_portal/v1/*`, and the prebuilt client's static
// files at `/portal`. Nothing here draws a page; the pages are drawn in the browser by the client, from this data.
import type { Effect } from "effect";
import type { LogbookReader } from "#modules/reader/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";

/** Where the portal's static files are: the Worker's assets binding (`assets.binding`), which answers a request for a file of the client. */
export interface PortalAssets {
  readonly fetch: (request: Request) => Promise<Response>;
}

/** The Worker's variables the portal reads. Every one is optional: a portal without a logbook shows nothing green. */
export interface PortalEnv {
  /** Where the logbook is. Held by the Worker, never sent to a browser. */
  readonly ORTHO_LOGBOOK_URL?: string;
  /** The revision this environment's bundle is. */
  readonly ORTHO_REVISION?: string;
  readonly ORTHO_ENVIRONMENT?: string;
  /** The client's files, as the Worker's static assets (K19). Without them `/portal` says the client is missing. */
  readonly PORTAL_ASSETS?: PortalAssets;
}

/** A decoded blueprint, its logbook reader if it has one, and the bundle's revision: all `handle` needs. */
export interface PortalContext {
  readonly blueprint: BlueprintWire;
  readonly reader: LogbookReader | null;
  readonly bundleRevision: string | null;
  /** Default `refs/heads/main`. */
  readonly ref?: string;
}

export interface ServerApi {
  /** Is this path the portal's: `/portal`, anything under it, or anything under `/_portal/`. */
  readonly owns: (pathname: string) => boolean;
  /** The data API: `/_portal/v1/*` answered, anything else a 404. Always succeeds: every failure is a status and a reason, never a page with a tick. */
  readonly handle: (context: PortalContext, request: Request) => Effect.Effect<Response>;
  /** The portal for a Worker: the generated blueprint JSON is decoded once (rejected when its schema or digest is not one this portal accepts), the logbook comes from the variables, `/portal*` comes from the client's static files. */
  readonly serve: (blueprint: unknown, request: Request, env: PortalEnv) => Effect.Effect<Response>;
}
