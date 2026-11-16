import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

export class AllowanceLimitTooHigh extends Schema.TaggedError<AllowanceLimitTooHigh>()(
  "AllowanceLimitTooHigh",
  { limit: Schema.Number, max: Schema.Number },
  { httpApiStatus: 422 }
) {}

export class AllowanceGroup extends HttpApiGroup.make("allowance").add(
  HttpApiEndpoint.post("grant", "/allowance/grant", {
    payload: Schema.Struct({ to: Schema.String, limit: Schema.Number }),
    success: Schema.Struct({ allowance: Schema.String }),
    error: AllowanceLimitTooHigh
  })
) {}

export class Api extends HttpApi.make("acme").add(AllowanceGroup) {}
