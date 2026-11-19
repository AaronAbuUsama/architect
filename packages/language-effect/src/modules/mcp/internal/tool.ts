import { Clock, Effect, Schema } from "effect";
import type { Principal } from "orthograph";
import { listItemFields } from "orthograph/server";
import { recordCall } from "#modules/handler/internal/call-metrics.js";
import type { Store } from "#modules/records/types.js";
import { Audience, Visibility } from "#modules/visibility/service.js";
import { Wire } from "#modules/wire/service.js";
import type { McpEntry, McpOperation, McpRefusals, McpResult, McpServed, McpTool } from "../types.ts";
import { hiddenInputs, inputSchema } from "./input.ts";

type AnyCodec = Schema.Codec<object, unknown>;
type Fields = { readonly [field: string]: unknown };

const failed = (line: string): McpResult => ({ isError: true, text: line });
/** What an unexpected failure says: a defect's detail is the operator's, never the caller's. */
const DEFECT = "[AR-500] InternalError";
const OWN = new Set(["_tag", "code", "message", "stack", "name", "cause"]);

/** Values as text: bigints as their digits, so what an MCP client reads is what the wire carries. */
const text = (x: unknown): string => JSON.stringify(x, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v));

/** What an agent is shown of an answer: the agent case of the one visibility rule. */
const shownAnswer = (wire: Fields, op: McpOperation, agent: Audience): Fields =>
  Visibility.redact(agent, op.answer, wire, op.kind === "read" && op.by === "list" ? listItemFields(op.thing) : undefined);

const refusalLine = (e: unknown, refusals: McpRefusals, agent: Audience): string | undefined => {
  const tag = typeof e === "object" && e !== null ? (e as { readonly _tag?: unknown })._tag : undefined;
  const code = typeof tag === "string" ? refusals.codes[tag] : undefined;
  if (typeof tag !== "string" || code === undefined) return undefined;
  const values = e as Fields;
  const declared = refusals.declared[tag];
  // A declared error shows the fields it declares that the caller may see; the machine's own refusal has `state`, public.
  const keys = declared ? Object.keys(declared.fields).filter((k) => Visibility.sees(agent, declared.fields[k]!)) : Object.keys(values).filter((k) => !OWN.has(k));
  const shown = keys.filter((k) => k in values).map((k) => `${k}: ${typeof values[k] === "object" ? text(values[k]) : String(values[k])}`);
  return `[${code}] ${tag}${shown.length > 0 ? ` { ${shown.join(", ")} }` : ""}`;
};

/** One operation or read as a tool: the call is the API's own (`run`), as the person the token names. */
export const toolOf = <R>(name: string, entry: McpEntry, served: McpServed<R>, refusals: McpRefusals): McpTool<R | Store> => {
  const op = entry.operation;
  const decode = Schema.decodeUnknownEffect(op.payloadSchema as unknown as AnyCodec);
  const encode = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  const hidden = new Set(hiddenInputs(op.payload));
  const items = op.kind === "read" && op.by === "list" ? listItemFields(op.thing) : {};

  const call = (args: Fields, principal: Principal): Effect.Effect<McpResult, never, R | Store> => Effect.gen(function* () {
    const start = yield* Clock.monotonicTimeNanos;
    return yield* decode(Object.fromEntries(Object.entries(args).filter(([k]) => !hidden.has(k)))).pipe(
      Effect.matchEffect({
        onFailure: (e) => recordCall(name, principal.kind, start, { outcome: "refused", refusal: "InvalidPayload" }).pipe(Effect.as(failed(`InvalidPayload: ${e.message}`))),
        onSuccess: (payload) =>
          served.run(payload as never, principal).pipe(
            Effect.flatMap((answer) => encode(answer as object).pipe(Effect.orDie)),
            Effect.flatMap((wire) =>
              Wire.held(op, payload, principal, op.answer, items).pipe(Effect.map((held): McpResult => {
                const shown = shownAnswer(wire as Fields, op, Audience.agent(held));
                return { isError: false, text: text(shown), structured: shown };
              })),
            ),
            Effect.catch((e) =>
              Wire.held(op, payload, principal, ...(typeof e === "object" && e !== null ? [refusals.declared[String((e as { _tag?: unknown })._tag)]?.fields ?? {}] : [])).pipe(
                Effect.map((held) => {
                  const line = refusalLine(e, refusals, Audience.agent(held));
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
  });

  return { name, description: entry.description, input: inputSchema(op.payloadSchema as unknown as Schema.Top, op.payload), readOnly: op.kind === "read", call };
};
