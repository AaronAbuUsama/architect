// The local trace viewer: `grafana/otel-lgtm` (Grafana, Tempo, Loki and an OTLP receiver in one container), started
// by `architect telemetry view`, fed by the Collector's second exporter while it runs (O1, spikes/local-trace-viewer).
import { Data, type Effect } from "effect";

export class ViewerFailed extends Data.TaggedError("ViewerFailed")<{ readonly message: string }> {}

/** A viewer that is up. Host addresses are loopback-only; container traffic stays on Docker's bridge. */
export interface Viewing {
  /** Grafana, with anonymous access: open it, no login. */
  readonly url: string;
  /** Whether Grafana lets anyone in with no login. When it doesn't, the login is `admin` / `admin`, Grafana's default. */
  readonly anonymous: boolean;
  /** The viewer's own OTLP/HTTP receiver, as the host sees it. */
  readonly otlp: string;
  /** The OTLP/HTTP receiver as a container on this machine sees it: what the Collector exports to. */
  readonly otlpFromContainers: string;
}

export interface ViewerApi {
  /** Start the viewer, or answer with the running one. Ready once Grafana and its OTLP receiver both answer. */
  readonly start: () => Effect.Effect<Viewing, ViewerFailed>;
  /** Stop and remove it. A viewer that isn't running is not an error, and nothing stays open. */
  readonly stop: () => Effect.Effect<void>;
  /** The running viewer, if there is one. Never starts anything. */
  readonly running: () => Effect.Effect<Viewing | undefined>;
  /** Where a trace is shown in Grafana: Tempo's Explore with the trace id as the query. */
  readonly link: (viewing: Viewing, trace: string) => string;
}
