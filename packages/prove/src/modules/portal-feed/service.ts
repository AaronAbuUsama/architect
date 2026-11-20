import { Effect } from "effect";
import type { PortalFeedApi } from "./types.ts";
import { close, listen } from "./internal/listen.ts";

export const PortalFeed: PortalFeedApi = {
  serve: (options) => Effect.acquireRelease(listen(options), close).pipe(Effect.map(({ url }) => ({ url }))),
};
