// Worker entry: no Node imports, no ambient configuration or I/O on import.
import { Context, Effect, Layer } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { Choices, repeat as declaration } from "./blueprint.js";

class Prefix extends Context.Service<Prefix, { readonly value: string }>()("fixture/Prefix") {}

export const layer = (choices: Choices) => Layer.succeed(Prefix, { value: choices.prefix });
export const repeat = (payload: PayloadOf<typeof declaration>) =>
  Effect.map(Prefix, ({ value }) => ({ text: `${value}${payload.text}` }));
