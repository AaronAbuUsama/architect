// Where `ortho prove --env staging --run <id>` goes: the deployed Worker's address, from the prefix `up` used and the account's subdomain. Never typed in a project.
import { Effect } from "effect";
import { resolve } from "node:path";
import { StagingRefused } from "../types.ts";
import { appOf } from "./app.ts";
import { prefixOf, RUN, stagingUrl } from "./plan.ts";

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
/** This machine only, as `ORTHO_STAGING_API` is for the lister: a stray variable cannot send a proof somewhere else. */
const LOOPBACK = /^(https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?)\/?$/;

export interface Address {
  readonly url: string;
  /** What a refusal calls it: `run r4417`. */
  readonly label: string;
}

/**
 * The address to judge, or why there is none. `origin` (`ORTHO_STAGING_ORIGIN`) is used as it is, when it is on this machine, and then
 * the subdomain (`ORTHO_STAGING_SUBDOMAIN`) is not needed. Nothing is contacted here.
 */
export const proveAddress = (options: {
  readonly root: string;
  readonly run: string | undefined;
  readonly subdomain: string | undefined;
  readonly origin: string | undefined;
}): Effect.Effect<Address, StagingRefused> =>
  Effect.gen(function* () {
    const { run, subdomain, origin } = options;
    if (run === undefined || !RUN.test(run)) {
      return yield* new StagingRefused({ message: `--run needs a run id of 1 to 20 lower-case letters and digits (got ${run === undefined ? "none" : JSON.stringify(run)})` });
    }
    const label = `run ${run}`;
    if (origin !== undefined) {
      const at = LOOPBACK.exec(origin)?.[1];
      if (at === undefined) return yield* new StagingRefused({ message: `ORTHO_STAGING_ORIGIN must be an http address on this machine (localhost or 127.0.0.1), got ${JSON.stringify(origin)}` });
      return { url: at, label };
    }
    if (subdomain === undefined || !LABEL.test(subdomain)) {
      return yield* new StagingRefused({ message: `ORTHO_STAGING_SUBDOMAIN is ${subdomain === undefined ? "not set" : `not a subdomain (${JSON.stringify(subdomain)})`}: one label of lower-case letters, digits and dashes, 1 to 63, not starting or ending with a dash` });
    }
    const app = yield* appOf(resolve(options.root));
    return { url: stagingUrl(prefixOf(app, run), subdomain), label };
  });
