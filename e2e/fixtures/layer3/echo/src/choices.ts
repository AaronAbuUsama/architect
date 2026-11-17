import { Schema } from "@architect/blueprint";

export const Choices = Schema.Struct({ prefix: Schema.String, meta: Schema.Unknown });
export type Choices = typeof Choices.Type;
