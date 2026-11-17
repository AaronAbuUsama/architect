// Throwaway package declaration entry: imports no Worker or Node runtime.
import { Blueprint, Schema } from "@architect/blueprint";

export const Choices = Schema.Struct({ prefix: Schema.String });
export type Choices = typeof Choices.Type;
export const Echo = Blueprint.thing({
  description: "A fixture echo.",
  fields: { id: Blueprint.id("echo") },
});
export const repeat = Blueprint.operation(Echo, {
  description: "Answer with the configured prefix and supplied text.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { text: Blueprint.text({ max: 128 }) },
  allowed: [Blueprint.anyone],
});
