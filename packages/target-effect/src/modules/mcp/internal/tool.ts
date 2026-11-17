import { Effect, Schema } from "effect";
import type { Operation, Principal, Read, Role } from "@architect/blueprint";
import { Access } from "#modules/access/service.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import type { McpEntry, McpRefusals, McpResult, McpServed, McpTool } from "../types.ts";
import { inputSchema } from "./input.ts";
import { hiddenInputs, needsRoles, seenBy, shownOf, text, type Seen } from "./shown.ts";

type AnyCodec = Schema.Codec<object, unknown>;
type Fields = { readonly [field: string]: unknown };

const failed = (line: string): McpResult => ({ isError: true, text: line });
/** What an unexpected failure says: a defect's detail is the operator's, never the caller's. */
const DEFECT = "[AR-500] InternalError";
const OWN = new Set(["_tag", "code", "message", "stack", "name", "cause"]);

/** The roles the caller holds in this call, asked only when some field is private to roles. */
const rolesHeld = (op: Operation | Read, payload: object, principal: Principal, needed: boolean): Effect.Effect<ReadonlyArray<Role>, never, Store> =>
  needed
    ? Effect.gen(function* () {
        const unit = yield* Unit.make(yield* Store);
        return yield* Access.holds({ allowed: op.allowed, payloadFields: op.payload, payload, principal, thing: op.thing }).pipe(Effect.provideService(Records, unit.records));
      })
    : Effect.succeed([]);

/** A list read's `items` are whole instances: each is cut to the thing's fields that are shown, and `state`. */
const shownAnswer = (wire: Fields, op: Operation | Read, seen: Seen): Fields => {
  const top = shownOf(wire, op.answer, seen);
  if (op.kind !== "read" || op.by !== "list" || !Array.isArray(top["items"])) return top;
  const items = (top["items"] as ReadonlyArray<object>).map((i) => Object.fromEntries(Object.entries(i).filter(([f]) => f === "state" || seen(op.thing.fields[f]?.visibility))));
  return { ...top, items };
};

const refusalLine = (e: unknown, refusals: McpRefusals, seen: Seen): string | undefined => {
  const tag = typeof e === "object" && e !== null ? (e as { readonly _tag?: unknown })._tag : undefined;
  const code = typeof tag === "string" ? refusals.codes[tag] : undefined;
  if (typeof tag !== "string" || code === undefined) return undefined;
  const values = e as Fields;
  const declared = refusals.declared[tag];
  // A declared error shows the fields it declares that the caller may see; the machine's own refusal has `state`, public.
  const keys = declared ? Object.keys(declared.fields).filter((k) => seen(declared.fields[k]!.visibility)) : Object.keys(values).filter((k) => !OWN.has(k));
  const shown = keys.filter((k) => k in values).map((k) => `${k}: ${typeof values[k] === "object" ? text(values[k]) : String(values[k])}`);
  return `[${code}] ${tag}${shown.length > 0 ? ` { ${shown.join(", ")} }` : ""}`;
};

/** One operation or read as a tool: the call is the API's own (`run`), as the person the token names. */
export const toolOf = <R>(name: string, entry: McpEntry, served: McpServed<R>, refusals: McpRefusals): McpTool<R | Store> => {
  const op = entry.operation;
  const decode = Schema.decodeUnknownEffect(op.payloadSchema as unknown as AnyCodec);
  const encode = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  const hidden = new Set(hiddenInputs(op.payload));
  const items = op.kind === "read" && op.by === "list" ? op.thing.fields : {};

  const call = (args: Fields, principal: Principal): Effect.Effect<McpResult, never, R | Store> =>
    decode(Object.fromEntries(Object.entries(args).filter(([k]) => !hidden.has(k)))).pipe(
      Effect.matchEffect({
        onFailure: (e) => Effect.succeed(failed(`InvalidPayload: ${e.message}`)),
        onSuccess: (payload) =>
          served.run(payload as never, principal).pipe(
            Effect.flatMap((answer) => encode(answer as object).pipe(Effect.orDie)),
            Effect.flatMap((wire) =>
              rolesHeld(op, payload, principal, needsRoles(op.answer, items)).pipe(Effect.map((held): McpResult => {
                const shown = shownAnswer(wire as Fields, op, seenBy(held));
                return { isError: false, text: text(shown), structured: shown };
              })),
            ),
            Effect.catch((e) =>
              rolesHeld(op, payload, principal, typeof e === "object" && e !== null && needsRoles(refusals.declared[String((e as { _tag?: unknown })._tag)]?.fields ?? {})).pipe(
                Effect.map((held) => {
                  const line = refusalLine(e, refusals, seenBy(held));
                  return line === undefined ? undefined : failed(line);
                }),
                Effect.flatMap((result) => (result === undefined ? Effect.die(e) : Effect.succeed(result))),
              ),
            ),
          ),
      }),
      // A defect (the handler's bug, a store that failed) is the operator's to read in telemetry, never the caller's.
      Effect.catchCause(() => Effect.succeed(failed(DEFECT))),
    );

  return { name, description: entry.description, input: inputSchema(op.payloadSchema as unknown as Schema.Top, op.payload), readOnly: op.kind === "read", call };
};
