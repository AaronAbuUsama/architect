import { Context, Effect, Layer } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import { Api } from "./api.ts"

export class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof Api>>()("acme/ApiClient") {
  static layer = (baseUrl: string) =>
    Layer.effect(
      ApiClient,
      HttpApiClient.make(Api, {
        transformClient: HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
      })
    ).pipe(Layer.provide(FetchHttpClient.layer))
}

export const grant = (to: string, limit: number) =>
  Effect.gen(function*() {
    const client = yield* ApiClient
    return yield* client.allowance.grant({ payload: { to, limit } })
  })
