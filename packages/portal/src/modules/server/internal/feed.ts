// A world's telemetry, read by its Worker (M1.13). The Worker runs in workerd and cannot open the collector's files, so whoever started the world
// (`ortho prove`) answers `GET <ORTHO_PORTAL_FEED>` with the window as it stands at that process's clock: its `now`, and the window's traces and
// metric points. The portal takes that `now` as the only clock there is, and scrubs everything itself (`Telemetry`); the feed is loopback only.
import { Effect } from "effect";
import type { MetricPoint, PortalLive, WindowFailure, WindowTrace } from "#modules/telemetry/types.js";

/** What the feed answers. */
export interface PortalFeed {
  readonly environment: string;
  readonly now: number;
  readonly windowMs: number;
  readonly traces: Readonly<Record<string, WindowTrace>>;
  readonly points: ReadonlyArray<MetricPoint>;
}

const isFeed = (value: unknown): value is PortalFeed => {
  const feed = value as Partial<PortalFeed> | null;
  return typeof feed === "object" && feed !== null && typeof feed.environment === "string" && typeof feed.now === "number" && typeof feed.windowMs === "number"
    && typeof feed.traces === "object" && feed.traces !== null && Array.isArray(feed.points);
};

const failing = (environment: string, message: string): PortalLive => ({
  environment, now: 0, windowMs: 0,
  source: { window: () => Effect.fail<WindowFailure>({ message }), find: () => Effect.fail<WindowFailure>({ message }) },
  metrics: { window: () => Effect.fail<WindowFailure>({ message }) },
});

/** The feed, read once: a live source over what it answered, or one whose reads all fail with the reason (never zeros). */
export const feedLive = (url: string, environment: string): Effect.Effect<PortalLive> =>
  Effect.tryPromise({ try: () => fetch(url), catch: String }).pipe(
    Effect.flatMap((response) => response.status === 200
      ? Effect.tryPromise({ try: () => response.json() as Promise<unknown>, catch: String })
      : Effect.fail(`it answered ${response.status}`)),
    Effect.map((found): PortalLive => {
      if (!isFeed(found)) return failing(environment, "the telemetry feed did not answer a window");
      const traces = new Map(Object.entries(found.traces));
      return {
        environment: found.environment, now: found.now, windowMs: found.windowMs,
        source: { window: () => Effect.succeed(traces), find: (trace) => Effect.succeed(traces.get(trace)) },
        metrics: { window: () => Effect.succeed(found.points) },
      };
    }),
    Effect.catch((reason) => Effect.succeed(failing(environment, `the telemetry feed could not be read: ${reason}`))),
  );
