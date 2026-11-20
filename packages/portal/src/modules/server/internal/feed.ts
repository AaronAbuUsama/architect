// A world's telemetry, read by its Worker (M1.13). The Worker runs in workerd and cannot open the collector's files, so whoever started the world
// (`ortho prove`) answers `GET <ORTHO_PORTAL_FEED>` with the window as it stands at that process's clock: its `now`, and the window's traces and
// metric points. The portal takes that `now` as the only clock there is, and scrubs everything itself (`Telemetry`); the feed is loopback only.
import { Clock, Effect } from "effect";
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

/** The window a portal reads when its feed said none. */
const DEFAULT_WINDOW_MS = 30 * 60_000;

/** A feed that could not be read still has a time: the clock's, never a sentinel (`0` would stamp the snapshot 1970). */
const failing = (environment: string, message: string, now: number): PortalLive => ({
  environment, now, windowMs: DEFAULT_WINDOW_MS,
  source: { window: () => Effect.fail<WindowFailure>({ message }), find: () => Effect.fail<WindowFailure>({ message }) },
  metrics: { window: () => Effect.fail<WindowFailure>({ message }) },
});

/** The feed, read once: a live source over what it answered, or one whose reads all fail with the reason (never zeros). */
export const feedLive = (url: string, environment: string): Effect.Effect<PortalLive> =>
  Effect.tryPromise({ try: () => fetch(url), catch: String }).pipe(
    Effect.flatMap((response) => response.status === 200
      ? Effect.tryPromise({ try: () => response.json() as Promise<unknown>, catch: String })
      : Effect.fail(`it answered ${response.status}`)),
    Effect.flatMap((found) => isFeed(found) ? Effect.succeed(found) : Effect.fail("the telemetry feed did not answer a window")),
    Effect.map((found): PortalLive => {
      const traces = new Map(Object.entries(found.traces));
      return {
        environment: found.environment, now: found.now, windowMs: found.windowMs,
        source: { window: () => Effect.succeed(traces), find: (trace) => Effect.succeed(traces.get(trace)) },
        metrics: { window: () => Effect.succeed(found.points) },
      };
    }),
    Effect.catch((reason) => Clock.currentTimeMillis.pipe(Effect.map((now) => failing(environment, `the telemetry feed could not be read: ${reason}`, now)))),
  );
