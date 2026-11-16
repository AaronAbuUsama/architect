import { Effect, Random } from "effect";
import type { IdsApi } from "./types.ts";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const make = (prefix: string) =>
  Effect.map(
    Effect.forEach(Array.from({ length: 16 }), () => Random.nextIntBetween(0, ALPHABET.length)),
    (digits) => `${prefix}_${digits.map((d) => ALPHABET[d]).join("")}`,
  );

export const Ids: IdsApi = {
  make,
  of: (field) => {
    const meta = field.value.meta;
    // An id field always carries its prefix; anything else is a mistake in the handler, caught the first time it runs.
    return meta.type === "id" ? (make(meta.prefix) as never) : Effect.die(new Error(`Ids.of: field ${field.key} is not an id`));
  },
};
