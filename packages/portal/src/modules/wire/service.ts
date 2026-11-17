import { Effect, Schema } from "effect";
import { BlueprintRejected, BlueprintSchema, ModelCore, ModelUnsupported, SCHEMA_VERSION, type BlueprintWire, type WireApi } from "./types.ts";
import { dependsOn, hashOf } from "./internal/depends.ts";
import { digestOf } from "./internal/digest.ts";

const UNAVAILABLE = {
  journeys: { state: "unavailable", reason: "the compiler's model has no journey projection" },
  evals: { state: "unavailable", reason: "the logbook stores aggregate verdicts only" },
  traces: { state: "unavailable", reason: "no trace source is wired to the portal yet" },
} as const;

const build: WireApi["build"] = ({ project, model, docs }) => {
  // The compiler's model, typed as the wire reads it, already has what `ModelCore` asks for.
  const asCore: ModelCore = model;
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    project,
    revision: null,
    model,
    dependsOnByOperation: Object.fromEntries(Object.keys(asCore.operations).sort().map((name) => [name, dependsOn(asCore, name)])),
    docs: Object.fromEntries(Object.entries(docs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    extensions: UNAVAILABLE,
  };
  return { ...unsigned, digest: digestOf(unsigned) } as BlueprintWire;
};

const decode: WireApi["decode"] = (json) =>
  Effect.gen(function* () {
    const version = typeof json === "object" && json !== null ? (json as { schemaVersion?: unknown }).schemaVersion : undefined;
    if (version !== SCHEMA_VERSION) {
      return yield* new BlueprintRejected({ reason: version === undefined ? "not a blueprint: it has no schema version" : `unknown schema version ${JSON.stringify(version)}: this portal reads version ${SCHEMA_VERSION}` });
    }
    const wire = yield* Schema.decodeUnknownEffect(BlueprintSchema)(json).pipe(
      Effect.mapError((e) => new BlueprintRejected({ reason: `not a blueprint this portal reads: ${e.message.split("\n")[0]}` })),
    );
    const { digest, ...unsigned } = json as Record<string, unknown> & { digest: string };
    if (digestOf(unsigned) !== digest) return yield* new BlueprintRejected({ reason: "its digest is not the digest of its content: it was changed after it was generated" });
    return wire;
  });

const core: WireApi["core"] = (json) =>
  Schema.decodeUnknownEffect(ModelCore)(json).pipe(
    Effect.mapError((e) => new ModelUnsupported({ reason: `a model shape this portal cannot judge a proof against: ${e.message.split("\n")[0]}` })),
  );

export const Wire: WireApi = { build, decode, core, dependsOn, hashOf, digestOf };
