import { createServer } from "node:net";
import { Effect } from "effect";

/** The port a world listens on: the one asked for, or, for 0, a free one the OS picks now (wrangler would pick its own and we would wait on port 0). */
export const portFor = (port: number): Effect.Effect<number> =>
  port !== 0
    ? Effect.succeed(port)
    : Effect.callback<number>((resume) => {
        const server = createServer();
        server.once("error", () => resume(Effect.die(new Error("no free port for the world"))));
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          const chosen = typeof address === "object" && address !== null ? address.port : 0;
          server.close(() => resume(Effect.succeed(chosen)));
        });
      });
