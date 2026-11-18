// An environment that hosts worlds has a collector of its own: a container that lives and dies with the environment,
// so what a world's journeys did is on disk beside the environment, and a prove that is killed leaves nothing behind.
import { createHash } from "node:crypto";
import { basename, join } from "node:path";

/** Where the collector writes, under the environment's folder. */
export const telemetryDir = (dir: string) => join(dir, "telemetry");

/** Stable for the folder, so `down` finds it from the pid file's folder alone. */
export const collectorName = (dir: string) => `ortho-collector-env-${basename(dir)}-${createHash("sha1").update(dir).digest("hex").slice(0, 8)}`;
