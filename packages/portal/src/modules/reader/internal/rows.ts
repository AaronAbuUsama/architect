import { Schema } from "effect";

const Verdict = Schema.Struct({
  seq: Schema.Number,
  revision: Schema.String,
  environment: Schema.String,
  operation: Schema.String,
  verdict: Schema.Literals(["pass", "fail"]),
  repository: Schema.String,
  ref: Schema.String,
  workflow: Schema.String,
  event_name: Schema.NullOr(Schema.String),
  sha: Schema.NullOr(Schema.String),
});

export const VerdictRows = Schema.Array(Verdict);

export const ReleaseRow = Schema.Struct({
  seq: Schema.Number,
  version: Schema.String,
  revision: Schema.String,
  ref: Schema.String,
  event_name: Schema.NullOr(Schema.String),
});
