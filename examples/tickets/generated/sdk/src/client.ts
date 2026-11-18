// Generated from the blueprint. Do not edit.
import { Context, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "../../api/src/index.ts";

export class Tickets extends Context.Service<Tickets, HttpApiClient.ForApi<typeof Api>>()("tickets/Client") {}

/** A client for the server at `baseUrl`, signed in with `token` when there is one. */
export const layer = (baseUrl: string, token?: string) =>
  Layer.effect(Tickets, HttpApiClient.make(Api, {
    transformClient: HttpClient.mapRequest((request) => {
      const at = HttpClientRequest.prependUrl(request, baseUrl);
      return token ? HttpClientRequest.bearerToken(at, token) : at;
    }),
  })).pipe(Layer.provide(FetchHttpClient.layer));
