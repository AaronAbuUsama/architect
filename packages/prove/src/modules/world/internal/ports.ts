import { createServer } from "node:net";
import { Effect } from "effect";
import { WorldFailed } from "../types.ts";

/** A port the system says is free on 127.0.0.1 now: what `port: 0` means. A failed listen fails the effect. */
export const anyPort = Effect.callback<number, WorldFailed>((resume) => {
  const server = createServer();
  server.once("error", (e) => resume(Effect.fail(new WorldFailed({ message: `no free port: ${e.message}` }))));
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as { port: number };
    server.close(() => resume(Effect.succeed(port)));
  });
});
