// Generated from the blueprint. Do not edit.
// The portal's host entry: this project's blueprint (blueprint.json, from the model and the generated docs), served by
// @architect/portal over the logbook. `/portal` is for people and `/_portal/v1/*` for data; nothing else is the portal's.
import { Effect } from "effect";
import { Portal, type PortalEnv } from "@architect/portal";
import blueprint from "./blueprint.json" with { type: "json" };

export type { PortalEnv };
export const owns: (pathname: string) => boolean = Portal.owns;
export const serve = (request: Request, env: PortalEnv): Promise<Response> => Effect.runPromise(Portal.serve(blueprint, request, env));
