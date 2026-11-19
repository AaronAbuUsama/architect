// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Context, Data, Effect, Layer, Predicate, Schedule, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import type { HttpClientError } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "../../api/src/index.ts";
import * as Credential from "./credential.ts";

export class Acme extends Context.Service<Acme, HttpApiClient.ForApi<typeof Api>>()("acme/Client") {}

/** The payload the schema refuses. It is raised before anything is sent. */
export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{ readonly message: string }> {}

/** What a call may be given besides its payload. Who is calling is never here: it is the layer's. */
export interface CallOptions {
  /** Names this call. A call made again with the same key is one call: the Worker answers it with the first answer. Made when the call starts, if not given. */
  readonly requestKey?: string | undefined;
}

/** What a client is made with: where the server is, and who it acts as (nobody is anonymous). */
export interface LayerOptions {
  readonly url: string;
  readonly credential?: Credential.Credential | undefined;
}

const RequestKey = Context.Reference<string | undefined>("acme/RequestKey", { defaultValue: () => undefined });

/** A client for the server at `baseUrl`, signed in with `token` when there is one (or `{ url, credential }`). */
export const layer = (target: string | LayerOptions, token?: string) => {
  const { url, credential } = typeof target === "string" ? { url: target, credential: token === undefined || token === "" ? undefined : Credential.session(token) } : target;
  const http = Layer.effect(Acme, HttpApiClient.make(Api, {
    transformClient: (httpClient) => httpClient.pipe(
      HttpClient.mapRequest((request) => Credential.apply(HttpClientRequest.prependUrl(request, url), credential)),
      // The key of the call that is being made, set by `call`; the Worker answers a request it has seen again with the first answer.
      HttpClient.mapRequestEffect((request) => Effect.map(RequestKey, (key) => (key === undefined ? request : HttpClientRequest.setHeader(request, "idempotency-key", key)))),
    ),
  })).pipe(Layer.provide(FetchHttpClient.layer));
  return http;
};

/** The answer never came (the connection was lost): the call may have landed. */
const lost = (e: unknown): e is HttpClientError.HttpClientError => Predicate.isTagged(e, "HttpClientError") && (e as HttpClientError.HttpClientError).reason._tag === "TransportError";

/** A server defect: it answered something its contract has no place for. */
const defect = (e: unknown) => (Predicate.isTagged(e, "HttpClientError") && ((e as HttpClientError.HttpClientError).response?.status ?? 0) >= 500) || Predicate.isTagged(e, "SchemaError");

/**
 * One call. The payload is checked first (`InvalidPayload`, nothing sent), the call gets its key, and when the answer is lost
 * an operation the Worker keeps an answer for (`retry`) is sent again with that same key, so it commits once. A refusal the
 * operation declares is in the error channel; a server defect is a die.
 */
export const call = <A, E, R>(
  how: { readonly payload: Schema.Codec<any, any, never, never>; readonly retry: boolean },
  payload: unknown,
  options: CallOptions | undefined,
  send: (client: HttpApiClient.ForApi<typeof Api>) => Effect.Effect<A, E, R>,
): Effect.Effect<A, Exclude<E, HttpClientError.HttpClientError | Schema.SchemaError> | HttpClientError.HttpClientError | InvalidPayload, R | Acme> =>
  Effect.gen(function* () {
    yield* Schema.encodeUnknownEffect(how.payload)(payload).pipe(Effect.mapError((e) => new InvalidPayload({ message: String(e.message) })));
    const key = options?.requestKey ?? (yield* Effect.sync(() => (globalThis as unknown as { readonly crypto: { randomUUID: () => string } }).crypto.randomUUID()));
    const client = yield* Acme;
    const once = send(client).pipe(Effect.provideService(RequestKey, key));
    const sent = how.retry ? once.pipe(Effect.retry({ while: lost as (e: unknown) => boolean, times: 3, schedule: Schedule.exponential("100 millis") })) : once;
    return yield* sent.pipe(Effect.catch((e: unknown) => (defect(e) ? Effect.die(e) : Effect.fail(e))));
  }) as never;
