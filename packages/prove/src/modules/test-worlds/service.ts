import { Effect } from "effect";
import { Environments } from "#modules/environments/service.js";
import { TestWorldFailed, type TestWorldsApi } from "./types.ts";
import { format, parse } from "./internal/lifetime.ts";

const failed = (message: string) => new TestWorldFailed({ message });

/** One call to the environment's `/_world/worlds` door: its status and its JSON. */
const door = (url: string, path: string, method: "GET" | "POST" | "DELETE", body?: unknown) =>
  Effect.tryPromise({
    try: () =>
      fetch(`${url}/_world/worlds${path}`, { method, ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) }).then((r) =>
        r.json().then((json) => ({ status: r.status, json: json as Record<string, unknown> }), () => ({ status: r.status, json: {} as Record<string, unknown> }))),
    catch: () => failed(`the test environment at ${url} didn't answer`),
  });

export const TestWorlds: TestWorldsApi = {
  create: ({ url, id, lifetimeMs }) =>
    Effect.gen(function* () {
      const made = yield* door(url, "", "POST", { id, lifetimeMs });
      if (made.status === 409) {
        return yield* failed(`world ${String(made.json["id"])} is still live in the test environment; \`architect worlds reap\` destroys it once its lifetime is up`);
      }
      if (made.status === 404) return yield* failed("this environment does not host worlds: it declares no lifetime");
      if (made.status !== 201) return yield* failed(`the test environment refused the world (${made.status}): ${String(made.json["error"] ?? "")}`);
      return { id, expires: Number(made.json["expires"]) };
    }),
  destroy: ({ url, id }) =>
    door(url, `/${id}`, "DELETE").pipe(
      Effect.flatMap((r) => (r.status === 200 ? Effect.void : Effect.fail(failed(`the test environment would not destroy world ${id} (${r.status})`)))),
    ),
  live: (url) =>
    door(url, "", "GET").pipe(
      Effect.map((r) => (r.status === 200 && Array.isArray(r.json["worlds"]) ? r.json["worlds"].length : undefined)),
      Effect.orElseSucceed(() => undefined),
    ),
  reap: ({ root, name }) =>
    Effect.gen(function* () {
      const before = yield* Environments.status({ root, name }).pipe(Effect.mapError((e) => failed(e.message)));
      const environment = yield* Environments.up({ root, name }).pipe(Effect.mapError((e) => failed(e.message)));
      const reaped = yield* door(environment.url, "/reap", "POST").pipe(
        Effect.flatMap((r) => (r.status === 200 ? Effect.succeed(Number(r.json["reaped"])) : Effect.fail(failed(`${name} would not reap (${r.status})`)))),
        // What this started, it stops again, whether or not the reap went through.
        Effect.ensuring(before.state === "down" ? Environments.down({ root, name }).pipe(Effect.ignore) : Effect.void),
      );
      return reaped;
    }),
  parseLifetime: parse,
  formatLifetime: format,
};
