import { createServer } from "node:net";
import { Effect } from "effect";

/** A port the system says is free on 127.0.0.1 now: what `port: 0` means. */
export const anyPort = Effect.callback<number>((resume) => {
  const server = createServer();
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as { port: number };
    server.close(() => resume(Effect.succeed(port)));
  });
});
