// Generated from the proposed fixture contract, manually for this spike. Do not edit.
// REPRESENTATIVE GENERATED-STYLE CODE: runtime is HTTP-only, imports the pure API.
import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "./api.ts";

export const repeat = (baseUrl: string, text: string) => HttpApiClient.make(Api, {
  transformClient: HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
}).pipe(
  Effect.flatMap((client) => client["kit-fixture-echo"].repeat({ payload: { text } })),
  Effect.provide(FetchHttpClient.layer),
);
