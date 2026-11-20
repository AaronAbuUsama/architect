import { createServer, type Server } from "node:http";
import { Clock, Effect } from "effect";
import { PortalFeedFailed, type PortalFeedApi, type PortalFeedOptions } from "./types.ts";

/** The window as it stands now: the traces whole, the metric points, and the `now` they were read at. */
const answer = (options: PortalFeedOptions) =>
  Effect.gen(function* () {
    const now = yield* options.now ?? Clock.currentTimeMillis;
    const traces = yield* options.source.window(options.windowMs, now);
    const points = yield* options.metrics.window(options.windowMs, now);
    return { environment: options.environment, now, windowMs: options.windowMs, traces: Object.fromEntries(traces), points };
  });

const listen = (options: PortalFeedOptions) =>
  Effect.callback<{ readonly server: Server; readonly url: string }, PortalFeedFailed>((resume) => {
    const server = createServer((request, response) => {
      if (request.method !== "GET") { response.writeHead(405).end(); return; }
      Effect.runPromise(Effect.result(answer(options))).then((done) => {
        if (done._tag === "Failure") response.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ _tag: "SourceFailed", message: done.failure.message }));
        else response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify(done.success));
      });
    });
    server.once("error", (error) => resume(Effect.fail(new PortalFeedFailed({ message: `the portal's telemetry feed couldn't listen: ${error.message}` }))));
    server.listen(0, "127.0.0.1", () => resume(Effect.succeed({ server, url: `http://127.0.0.1:${(server.address() as { port: number }).port}` })));
  });

const close = ({ server }: { readonly server: Server }) =>
  Effect.callback<void>((resume) => {
    server.close(() => resume(Effect.void));
    server.closeAllConnections();
  });

export const PortalFeed: PortalFeedApi = {
  serve: (options) => Effect.acquireRelease(listen(options), close).pipe(Effect.map(({ url }) => ({ url }))),
};
