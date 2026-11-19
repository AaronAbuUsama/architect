// generated/sdk/src/client.ts and credential.ts: the SDK contract (K5 seam 5). The caller is the layer's, a request key
// is kept across a call's retries, declared refusals are in the error channel, and a defect is a die.
import { Names } from "orthograph/server";
import { GENERATED, lines } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";

/** `Credential.session(token)`: who the client acts as. It is the layer's, set once, and never a call's. */
export const credentialFile = (): RenderedFile => ({
  path: "generated/sdk/src/credential.ts",
  scaffold: false,
  content: lines(
    GENERATED,
    `import { HttpClientRequest } from "effect/http";`,
    "",
    "/** A session: the bearer token the server gave when the person signed in. */",
    `export interface Session { readonly _tag: "Session"; readonly token: string }`,
    "",
    "/** Who the client acts as. Only a session so far; a key and a wallet come with their own constructors. */",
    "export type Credential = Session;",
    "",
    "/** The caller is a session. */",
    `export const session = (token: string): Session => ({ _tag: "Session", token });`,
    "",
    "/** The request, signed in as `credential`; with none, it goes as it is, an anonymous caller. */",
    "export const apply = (request: HttpClientRequest.HttpClientRequest, credential: Credential | undefined) =>",
    "  credential === undefined ? request : HttpClientRequest.bearerToken(request, credential.token);",
  ),
});

/** What `layer` is given: where the server is, who the client acts as, and, with operations that run here, where their spans go. */
const options = (device: boolean) => [
  "/** What a client is made with: where the server is, and who it acts as (nobody is anonymous). */",
  "export interface LayerOptions {",
  "  readonly url: string;",
  "  readonly credential?: Credential.Credential | undefined;",
  ...(device ? ["  /** Where the spans of operations that run here go; the standard variable when left out. */", "  readonly otlp?: string | undefined;"] : []),
  "}",
];

const layer = (name: string, client: string, device: boolean) => [
  device
    ? "/** A client for the server at `baseUrl`, signed in with `token` when there is one (or `{ url, credential }`); the spans of operations that run here go to `otlp`. */"
    : "/** A client for the server at `baseUrl`, signed in with `token` when there is one (or `{ url, credential }`). */",
  `export const layer = (target: string | LayerOptions, token?: string${device ? ", otlp: string | undefined = ambient()" : ""}) => {`,
  "  const { url, credential } = typeof target === \"string\" ? { url: target, credential: token === undefined || token === \"\" ? undefined : Credential.session(token) } : target;",
  ...(device ? ["  const where = typeof target === \"string\" ? otlp : target.otlp ?? ambient();"] : []),
  `  const http = Layer.effect(${client}, HttpApiClient.make(Api, {`,
  "    transformClient: (httpClient) => httpClient.pipe(",
  "      HttpClient.mapRequest((request) => Credential.apply(HttpClientRequest.prependUrl(request, url), credential)),",
  "      // The key of the call that is being made, set by `call`; the Worker answers a request it has seen again with the first answer.",
  "      HttpClient.mapRequestEffect((request) => Effect.map(RequestKey, (key) => (key === undefined ? request : HttpClientRequest.setHeader(request, \"idempotency-key\", key)))),",
  "    ),",
  "  })).pipe(Layer.provide(FetchHttpClient.layer));",
  ...(device ? [`  return Layer.mergeAll(http, Layer.succeed(${client}Spans, { otlp: where, service: "${name}" }));`] : ["  return http;"]),
  "};",
];

export const clientFile = (name: string, client: string, device: boolean): RenderedFile => ({
  path: "generated/sdk/src/client.ts",
  scaffold: false,
  content: lines(
    GENERATED,
    `import { Context, Data, Effect, Layer, Predicate, Schedule, Schema } from "effect";`,
    `import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";`,
    `import type { HttpClientError } from "effect/http";`,
    `import { HttpApiClient } from "effect/http-api";`,
    device ? `import type { DeviceWhere } from "${Names.pkg("language-effect")}/device";` : [],
    `import { Api } from "../../api/src/index.ts";`,
    `import * as Credential from "./credential.ts";`,
    "",
    `export class ${client} extends Context.Service<${client}, HttpApiClient.ForApi<typeof Api>>()("${name}/Client") {}`,
    ...(device ? [
      "",
      "/** Where the spans of an operation that runs on this device go, and the service they say they are from. */",
      `export class ${client}Spans extends Context.Service<${client}Spans, DeviceWhere>()("${name}/Spans") {}`,
      "",
      "/** The standard variable, read where the SDK is made: a program that names no collector gets the one its environment does. */",
      `const ambient = () => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.["OTEL_EXPORTER_OTLP_ENDPOINT"];`,
    ] : []),
    "",
    "/** The payload the schema refuses. It is raised before anything is sent. */",
    `export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{ readonly message: string }> {}`,
    "",
    "/** What a call may be given besides its payload. Who is calling is never here: it is the layer's. */",
    "export interface CallOptions {",
    "  /** Names this call. A call made again with the same key is one call: the Worker answers it with the first answer. Made when the call starts, if not given. */",
    "  readonly requestKey?: string | undefined;",
    "}",
    "",
    ...options(device),
    "",
    `const RequestKey = Context.Reference<string | undefined>("${name}/RequestKey", { defaultValue: () => undefined });`,
    "",
    ...layer(name, client, device),
    "",
    "/** The answer never came (the connection was lost): the call may have landed. */",
    `const lost = (e: unknown): e is HttpClientError.HttpClientError => Predicate.isTagged(e, "HttpClientError") && (e as HttpClientError.HttpClientError).reason._tag === "TransportError";`,
    "",
    "/** A server defect: it answered something its contract has no place for. */",
    `const defect = (e: unknown) => (Predicate.isTagged(e, "HttpClientError") && ((e as HttpClientError.HttpClientError).response?.status ?? 0) >= 500) || Predicate.isTagged(e, "SchemaError");`,
    "",
    "/**",
    " * One call. The payload is checked first (`InvalidPayload`, nothing sent), the call gets its key, and when the answer is lost",
    " * an operation the Worker keeps an answer for (`retry`) is sent again with that same key, so it commits once. A refusal the",
    " * operation declares is in the error channel; a server defect is a die.",
    " */",
    "export const call = <A, E, R>(",
    "  how: { readonly payload: Schema.Codec<any, any, never, never>; readonly retry: boolean },",
    "  payload: unknown,",
    "  options: CallOptions | undefined,",
    `  send: (client: HttpApiClient.ForApi<typeof Api>) => Effect.Effect<A, E, R>,`,
    `): Effect.Effect<A, Exclude<E, HttpClientError.HttpClientError | Schema.SchemaError> | HttpClientError.HttpClientError | InvalidPayload, R | ${client}> =>`,
    "  Effect.gen(function* () {",
    "    yield* Schema.encodeUnknownEffect(how.payload)(payload).pipe(Effect.mapError((e) => new InvalidPayload({ message: String(e.message) })));",
    "    const key = options?.requestKey ?? (yield* Effect.sync(() => (globalThis as unknown as { readonly crypto: { randomUUID: () => string } }).crypto.randomUUID()));",
    `    const client = yield* ${client};`,
    "    const once = send(client).pipe(Effect.provideService(RequestKey, key));",
    "    const sent = how.retry ? once.pipe(Effect.retry({ while: lost as (e: unknown) => boolean, times: 3, schedule: Schedule.exponential(\"100 millis\") })) : once;",
    "    return yield* sent.pipe(Effect.catch((e: unknown) => (defect(e) ? Effect.die(e) : Effect.fail(e))));",
    "  }) as never;",
  ),
});
