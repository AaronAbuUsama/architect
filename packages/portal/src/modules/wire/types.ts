// The portal's wire: one versioned JSON document, made from the compiler's model and the generated docs, which the app
// reads instead of any project source (F1 §1, D3 #130). Plain data; no Effect in what the browser holds.
import { Data, type Effect, Schema } from "effect";

/** Bumped only when a core meaning changes; an addition is an extension key, which a reader ignores when it does not know it. */
export const SCHEMA_VERSION = 1 as const;

export type Availability<T> =
  | { readonly state: "available"; readonly value: T }
  | { readonly state: "unavailable"; readonly reason: string };

const Field = Schema.Struct({
  value: Schema.Record(Schema.String, Schema.Unknown),
  named: Schema.optionalKey(Schema.String),
  ref: Schema.optionalKey(Schema.String),
  optional: Schema.optionalKey(Schema.Boolean),
  /** What the field is, in the declaration's own words (`Blueprint.described`; M1.42). */
  description: Schema.optionalKey(Schema.String),
  /** Who may see its value, as the model has it: `"secret"`, or `{ private: [roles] }`; absent means public. The wire holds declarations, never values. */
  visibility: Schema.optionalKey(Schema.Union([Schema.Literal("secret"), Schema.Struct({ private: Schema.Array(Schema.String) })])),
  /** A secret answer field handed to its caller once (`Blueprint.issued`). */
  issued: Schema.optionalKey(Schema.Literal(true)),
});
const Fields = Schema.Record(Schema.String, Field);

/** What a proof's dependencies are worked out from: hashes, field refs and roles. Every model the logbook holds has this much, or is unsupported. */
const CoreField = Schema.Struct({ ref: Schema.optionalKey(Schema.String) });
const CoreFields = Schema.Record(Schema.String, CoreField);
export const ModelCore = Schema.Struct({
  things: Schema.Record(Schema.String, Schema.Struct({ hash: Schema.String, fields: CoreFields })),
  operations: Schema.Record(Schema.String, Schema.Struct({
    thing: Schema.String,
    hash: Schema.String,
    payload: CoreFields,
    answer: CoreFields,
    allowed: Schema.Array(Schema.Struct({ kind: Schema.String, role: Schema.optionalKey(Schema.String) })),
  })),
});
export type ModelCore = typeof ModelCore.Type;

const Operation = Schema.Struct({
  kind: Schema.Literals(["operation", "read"]),
  name: Schema.String,
  thing: Schema.String,
  verb: Schema.String,
  description: Schema.String,
  payload: Fields,
  answer: Fields,
  move: Schema.NullOr(Schema.Struct({ key: Schema.String, from: Schema.Array(Schema.String), to: Schema.Array(Schema.String), emits: Schema.String })),
  errors: Schema.Array(Schema.String),
  refusals: Schema.Array(Schema.String),
  allowed: Schema.Array(Schema.Struct({ kind: Schema.String, role: Schema.optionalKey(Schema.String), path: Schema.optionalKey(Schema.String) })),
  steps: Schema.Record(Schema.String, Schema.Struct({ name: Schema.String, type: Schema.String })),
  idempotent: Schema.NullOr(Schema.Literal("request")),
  budget: Schema.NullOr(Schema.Struct({ p95Ms: Schema.Number })),
  hash: Schema.String,
});

const Thing = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  fields: Fields,
  lives: Schema.Literals(["database", "actor"]),
  machine: Schema.NullOr(Schema.Struct({
    states: Schema.Array(Schema.String),
    moves: Schema.Record(Schema.String, Schema.Struct({ from: Schema.Array(Schema.String), to: Schema.Array(Schema.String), emits: Schema.String })),
    notFrom: Schema.Struct({ error: Schema.String, exit: Schema.Number }),
  })),
  roles: Schema.Array(Schema.String),
  hash: Schema.String,
});

const Environment = Schema.Struct({ name: Schema.String, runs: Schema.String, promotesFrom: Schema.NullOr(Schema.String), lifetimeMs: Schema.NullOr(Schema.Number) });

/** The compiler's model as far as the portal reads it. The digest is over the whole document, so what it does not read is still what it holds. */
export const ModelSchema = Schema.Struct({
  things: Schema.Record(Schema.String, Thing),
  operations: Schema.Record(Schema.String, Operation),
  environments: Schema.optionalKey(Schema.Record(Schema.String, Environment)),
  blanks: Schema.optionalKey(Schema.Record(Schema.String, Schema.Array(Schema.String))),
});
export type ModelWire = typeof ModelSchema.Type;
export type OperationWire = ModelWire["operations"][string];
export type ThingWire = ModelWire["things"][string];
export type FieldWire = typeof Field.Type;

export type Depends = Readonly<Record<string, string>>;

export const BlueprintSchema = Schema.Struct({
  schemaVersion: Schema.Literal(SCHEMA_VERSION),
  project: Schema.String,
  /** Always null here: the generator never labels a model with a revision. The bundle that holds it names its own. */
  revision: Schema.NullOr(Schema.String),
  /** sha256 of the canonical text of everything else in this document. */
  digest: Schema.String,
  model: ModelSchema,
  /** Per operation: what its proof rests on, as `Compare.dependsOn` says (the adapter reaches the same). */
  dependsOnByOperation: Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.String)),
  /** The generated docs, as text: their path under `generated/docs`, and the Markdown. */
  docs: Schema.Record(Schema.String, Schema.String),
  /** Availability-tagged additions; a key a reader does not know is ignored. */
  extensions: Schema.Record(Schema.String, Schema.Unknown),
});
export type BlueprintWire = typeof BlueprintSchema.Type;

/** The blueprint is not one this reader accepts: its schema version is unknown, its digest is not its content's, or it is not a blueprint. */
export class BlueprintRejected extends Data.TaggedError("BlueprintRejected")<{ readonly reason: string }> {}
/** A model the logbook holds that this reader cannot judge a proof against. */
export class ModelUnsupported extends Data.TaggedError("ModelUnsupported")<{ readonly reason: string }> {}

export interface WireApi {
  /** The blueprint for `project`: deterministic (no clock, no revision), its digest set. */
  readonly build: (input: { readonly project: string; readonly model: ModelWire; readonly docs: Readonly<Record<string, string>> }) => BlueprintWire;
  /** Accept a blueprint only if its schema version is known, it fits, and its digest is its content's. */
  readonly decode: (json: unknown) => Effect.Effect<BlueprintWire, BlueprintRejected>;
  /** A model the logbook holds, as far as a proof's dependencies need it; unsupported shapes are an error, never a guess. */
  readonly core: (json: unknown) => Effect.Effect<ModelCore, ModelUnsupported>;
  /** What an operation's proof rests on: itself, its thing, the things its own or its thing's fields refer to, and the things whose roles may call it. Same as the compiler's `Compare.dependsOn`. */
  readonly dependsOn: (model: ModelCore, operation: string) => Depends;
  /** The current hash of a dependency key, or undefined when it no longer exists. Same as `Compare.hashOf`. */
  readonly hashOf: (model: ModelCore, key: string) => string | undefined;
  /** sha256 of the canonical text of a blueprint's content without its digest. */
  readonly digestOf: (unsigned: unknown) => string;
}
