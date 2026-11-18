// Where the app finds the project: the only file in server/forman that reads the environment.
import { resolve } from "node:path";

const root = resolve(process.env["FORMAN_ROOT"] ?? resolve(process.cwd(), "../../../examples/acme"));

export const config = {
  /** The project's root: its model, its blueprint, its telemetry folder. */
  root,
  /** acme's `forman dev`. */
  acme: process.env["ACME_URL"] ?? "http://127.0.0.1:8795",
  /** The Collector's file exporter for `forman dev` (the environment in scope: local). */
  telemetry: resolve(root, ".forman/dev-telemetry"),
  /** Where prose about a declaration lives. The product writes it beside the declaration in the repo (F6 #3); the
   * spike may not add files under examples/acme, so it mirrors the blueprint's paths under spikes/generated-app/prose. */
  prose: resolve(process.env["FORMAN_PROSE"] ?? resolve(process.cwd(), "../prose")),
};
