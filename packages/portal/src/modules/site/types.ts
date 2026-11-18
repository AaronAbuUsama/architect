// The portal as a route of an environment's Worker: `/portal` for people, `/_portal/v1/*` for data (F1 §1, §5; D3 #130).
import type { Effect } from "effect";
import type { LogbookReader } from "#modules/reader/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";

/** The Worker's variables the portal reads. Every one is optional: a portal without a logbook shows nothing green. */
export interface PortalEnv {
  /** Where the logbook is. Held by the Worker, never sent to a browser. */
  readonly ORTHO_LOGBOOK_URL?: string;
  /** The revision this environment's bundle is. */
  readonly ORTHO_REVISION?: string;
  readonly ORTHO_ENVIRONMENT?: string;
}

/** A decoded blueprint, its logbook reader if it has one, and the bundle's revision: all `handle` needs. */
export interface PortalContext {
  readonly blueprint: BlueprintWire;
  readonly reader: LogbookReader | null;
  readonly bundleRevision: string | null;
  /** Default `refs/heads/main`. */
  readonly ref?: string;
}

export interface SiteApi {
  /** Is this path the portal's: `/portal`, anything under it, or anything under `/_portal/`. */
  readonly owns: (pathname: string) => boolean;
  /** Answer a request, always: every failure is a status and a reason, and none is a page with a tick on it. */
  readonly handle: (context: PortalContext, request: Request) => Effect.Effect<Response>;
  /** `handle` for a Worker: the generated blueprint JSON is decoded once (rejected when its schema or digest is not one this portal accepts), and the logbook comes from the variables. */
  readonly serve: (blueprint: unknown, request: Request, env: PortalEnv) => Effect.Effect<Response>;
}
