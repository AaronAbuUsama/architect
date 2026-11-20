// Generated from the blueprint. Do not edit.
import { Context, Data, Effect, Layer, Schedule, Schema } from "effect";
import { SecureRandom } from "effect/crypto";
import { FetchHttpClient, HttpClient, HttpClientError, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "../../api/src/index.ts";

export class Signup extends Context.Service<Signup, HttpApiClient.ForApi<typeof Api>>()("signup/Client") {}

/** Who a client's calls are made as. It is set once, on the client's layer, and never on a call. */
export type Credential = { readonly kind: "session"; readonly token: string };
export const Credential = {
  /** A signed-in session: the token a sign-in gave, sent as a bearer token. */
  session: (token: string): Credential => ({ kind: "session", token }),
};

/** A payload its schema refuses. The call never left the client. */
export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{ readonly message: string }> {}

/** What a call may be given: the key that makes its retries one request. Never a credential. */
export interface CallOptions {
  /** The key the server keeps the answer under. Made when the call starts when not given, and kept across its retries. */
  readonly requestKey?: string | undefined;
}

const RequestKey = Context.Reference<string | undefined>("signup/RequestKey", { defaultValue: () => undefined });

const isTransport = (error: unknown) => HttpClientError.isHttpClientError(error) && error.reason._tag === "TransportError";

/**
 * One call. Its payload is encoded first: one the schema refuses is `InvalidPayload`, and nothing is sent. A request key is made
 * when the call starts (or the caller's is used) and sent as `idempotency-key` on every try. An operation the server keeps an
 * answer for is tried again when the connection was cut before the answer came, with the same key, so it commits once.
 * A response the server could not answer is a defect (a die), never a typed failure.
 */
export const call = <A, E, R>(
  declaration: { readonly payloadSchema: Schema.Codec<any, any> },
  payload: unknown,
  options: CallOptions | undefined,
  retry: boolean,
  send: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | InvalidPayload, R> =>
  Effect.gen(function* () {
    yield* Schema.encodeUnknownEffect(declaration.payloadSchema)(payload).pipe(Effect.mapError((cause) => new InvalidPayload({ message: String(cause) })));
    const key = options?.requestKey ?? (yield* Effect.flatMap(SecureRandom.SecureRandom, (random) => random.uuidV4()));
    const tries = retry ? Effect.retry(send, { schedule: Schedule.exponential("50 millis"), times: 3, while: isTransport }) : send;
    return yield* tries.pipe(
      Effect.catchIf((error) => HttpClientError.isHttpClientError(error) && !isTransport(error), (error) => Effect.die(error)),
      Effect.provideService(RequestKey, key),
    );
  }).pipe(Effect.provide(SecureRandom.layerWebCrypto));

const connect = (url: string, credential: Credential | undefined) =>
  Layer.effect(Signup, HttpApiClient.make(Api, {
    transformClient: HttpClient.mapRequestEffect((request) =>
      Effect.map(Effect.service(RequestKey), (key) => {
        const at = HttpClientRequest.prependUrl(request, url);
        const signed = credential === undefined ? at : HttpClientRequest.bearerToken(at, credential.token);
        return key === undefined ? signed : HttpClientRequest.setHeader(signed, "idempotency-key", key);
      })),
  })).pipe(Layer.provide(FetchHttpClient.layer));

/** A client for the server at `url`, as `credential` when there is one. */
export interface Options { readonly url: string; readonly credential?: Credential | undefined }

/** `layer({ url, credential })`, or `layer(url, token)`: the same client, the token being a session's. */
export const layer = (options: string | Options, token?: string) =>
  typeof options === "string" ? connect(options, token === undefined || token === "" ? undefined : Credential.session(token)) : connect(options.url, options.credential);
