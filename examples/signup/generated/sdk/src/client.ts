// Generated from the blueprint. Do not edit.
import { Context, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "../../api/src/index.ts";

export class Signup extends Context.Service<Signup, HttpApiClient.ForApi<typeof Api>>()("signup/Client") {}

/** A client for the server at `baseUrl`, signed in with `token` when there is one. */
export const layer = (baseUrl: string, token?: string) =>
  Layer.effect(Signup, HttpApiClient.make(Api, {
    transformClient: HttpClient.mapRequest((request) => {
      const at = HttpClientRequest.prependUrl(request, baseUrl);
      return token ? HttpClientRequest.bearerToken(at, token) : at;
    }),
  })).pipe(Layer.provide(FetchHttpClient.layer));
