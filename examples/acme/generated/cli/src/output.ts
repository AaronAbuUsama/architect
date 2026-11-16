// Generated from the blueprint. Do not edit.
import { Console, Context, Effect } from "effect";
import { Errors } from "../../sdk/src/index.ts";

/** Set by the entry, so commands never touch the process. */
export class ExitCode extends Context.Service<ExitCode, { readonly set: (code: number) => Effect.Effect<void> }>()("cli/ExitCode") {}

const text = (x: unknown) => JSON.stringify(x, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v));
const exitOf = (tag: unknown): number =>
  typeof tag === "string" && tag in Errors.exits ? Errors.exits[tag as keyof typeof Errors.exits] : tag === "SchemaError" ? 2 : 1;

/**
 * A one-field answer prints its value, or with `json` the whole answer as JSON. A refusal prints its name and fields
 * to stderr and exits with its code.
 */
export const answer = (json: boolean) => <A extends object, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.flatMap((a) => Console.log(!json && Object.keys(a).length === 1 ? String(Object.values(a)[0]) : text(a))),
    Effect.catch((e: unknown) => {
      const tag = typeof e === "object" && e !== null ? (e as { readonly _tag?: unknown })._tag : undefined;
      const { _tag: _, ...fields } = (typeof e === "object" && e !== null ? e : {}) as Record<string, unknown>;
      const said = tag === "SchemaError" ? String((e as { readonly message?: unknown }).message) : text(fields);
      return Console.error(`${String(tag ?? "Error")}: ${said}`).pipe(
        Effect.andThen(Effect.flatMap(ExitCode, (exit) => exit.set(exitOf(tag)))),
      );
    }),
  );
