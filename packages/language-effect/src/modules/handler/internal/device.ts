// An operation that runs on the device (M1.27): the same handler, steps and spans as a served one, in the caller's own
// process, with no store, no journal and no one to ask who is calling. Its spans leave as OTLP/HTTP from here, and are
// flushed before the call returns, because a CLI may exit the moment it does.
import { Cause, Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import type { Operation, Principal } from "orthograph";
import type { DeviceApi, DeviceWhere } from "../types.ts";
import { answerAttributes, payloadAttributes, principalAttributes } from "./attributes.ts";
import { spanned } from "./span.ts";

type AnyCodec = Schema.Codec<object, unknown>;
type AnyHandler = (payload: object, context: { principal: Principal; steps: object; move: (to?: string) => Effect.Effect<void> }) => Effect.Effect<object, unknown, unknown>;

/** On a device nobody can say who is calling, so every caller is anonymous and an operation is open to anyone. */
const principal: Principal = { kind: "anonymous" };

/** The spans of one call, sent to the collector at `otlp`; closing the layer is the flush. */
const exporter = (otlp: string, service: string) =>
  OtlpTracer.layer({ url: `${otlp.replace(/\/+$/, "")}/v1/traces`, resource: { serviceName: service }, exportInterval: "100 millis", maxBatchSize: 64, shutdownTimeout: "3 seconds" }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
  );

const tagOf = (e: unknown): string =>
  typeof e === "object" && e !== null && typeof (e as { _tag?: unknown })._tag === "string" ? (e as { _tag: string })._tag : String(e);

const device = ({ name, operation, handler }: { readonly name: string; readonly operation: unknown; readonly handler: AnyHandler }) => {
  const op = operation as Operation;
  const check = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  // Every step is its own span, marked with its kind, as a served operation's are.
  const steps = Object.fromEntries(
    Object.entries(op.steps).map(([key, step]) => [key, <A, E, R>(work: Effect.Effect<A, E, R>) => spanned(`${name}.${key}`, { "step.kind": step.type })(work)]),
  );
  const move = () => Effect.void;
  return {
    name,
    run: (payload: object, where: DeviceWhere) =>
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan(payloadAttributes(payload, op.payload));
        const answer = yield* handler(payload, { principal, steps, move });
        yield* Effect.annotateCurrentSpan(answerAttributes(answer, op.answer));
        // An answer that breaks its declaration is the handler's bug: it dies, loudly.
        yield* check(answer).pipe(Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)), Effect.orDie);
        return answer;
      }).pipe(
        Effect.tapCause((cause) => Cause.hasDies(cause)
          ? Effect.annotateCurrentSpan({ defect: Cause.pretty(cause).split("\n")[0] ?? "" })
          : Effect.annotateCurrentSpan({ refusal: tagOf(Cause.squash(cause)) })),
        spanned(name, { operation: name, ...principalAttributes(principal) }),
        where.otlp === undefined ? (effect) => effect : Effect.provide(exporter(where.otlp, where.service)),
      ),
  };
};

/** Typed at the edge (`DeviceApi`); inside, one untyped implementation serves every operation. */
export const Device: DeviceApi = { serve: device as unknown as DeviceApi["serve"] };
