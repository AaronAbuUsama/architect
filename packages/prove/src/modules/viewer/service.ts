import { Effect, Schedule } from "effect";
import { ViewerFailed, type Viewing, type ViewerApi } from "./types.ts";
import { NAME, bridgeAddress, docker, isRunning, portOf, runArgs } from "./internal/docker.ts";

const viewing = (grafana: number, otlp: number, bridge: string, anonymous: boolean): Viewing => ({
  url: `http://127.0.0.1:${grafana}`,
  anonymous,
  otlp: `http://127.0.0.1:${otlp}`,
  otlpFromContainers: `http://${bridge}:4318`,
});

const running = (): Effect.Effect<Viewing | undefined> =>
  Effect.gen(function* () {
    if (!(yield* isRunning(NAME))) return undefined;
    const [grafana, otlp] = [yield* portOf(NAME, 3000), yield* portOf(NAME, 4318)];
    const bridge = yield* bridgeAddress(NAME);
    if (grafana === undefined || otlp === undefined || bridge === undefined) return undefined;
    // Anonymous access shows as an answer to an API call made with no credentials: `/api/user` never does, as the
    // anonymous visitor is no user, so ask for something an org admin may list.
    const anonymous = yield* answers(`http://127.0.0.1:${grafana}/api/datasources`).pipe(Effect.match({ onFailure: () => false, onSuccess: () => true }));
    return viewing(grafana, otlp, bridge, anonymous);
  });

const answers = (url: string, init?: RequestInit) =>
  Effect.tryPromise({ try: () => fetch(url, init).then((r) => r.ok), catch: () => false }).pipe(
    Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))),
  );

/** Grafana answers its health check, and the OTLP receiver takes an (empty) export: the spike's readiness rule. */
const waitReady = (v: Viewing) =>
  answers(`${v.url}/api/health`).pipe(
    Effect.andThen(answers(`${v.otlp}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })),
    Effect.retry({ schedule: Schedule.spaced("500 millis"), times: 240 }),
    Effect.mapError(() => new ViewerFailed({ message: `the viewer didn't answer within 2 minutes; \`docker logs ${NAME}\` says why` })),
  );

export const Viewer: ViewerApi = {
  running,
  start: () =>
    Effect.gen(function* () {
      const already = yield* running();
      if (already) return already;
      // A stopped container of the same name (a start that died half way) would refuse the name.
      yield* docker(["rm", "-f", NAME]);
      const run = yield* docker(runArgs());
      if (run.status !== 0) return yield* new ViewerFailed({ message: `docker couldn't start the viewer: ${(run.stderr || run.stdout).trim()}` });
      const up = yield* running();
      if (!up) return yield* new ViewerFailed({ message: "the viewer started but published no ports" });
      yield* waitReady(up).pipe(Effect.tapError(() => docker(["rm", "-f", NAME])));
      // Asked again now it answers: whether anonymous access works is only known once Grafana is up.
      return (yield* running()) ?? up;
    }),
  stop: () => docker(["rm", "-f", NAME]).pipe(Effect.asVoid),
  link: (v, trace) => {
    // Tempo's Explore, with the trace id as the query: what the viewer's own "open in Explore" builds.
    const pane = { a: { datasource: "tempo", queries: [{ refId: "A", datasource: { type: "tempo", uid: "tempo" }, queryType: "traceql", query: trace }], range: { from: "now-6h", to: "now" } } };
    return `${v.url}/explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(pane))}&orgId=1`;
  },
};
