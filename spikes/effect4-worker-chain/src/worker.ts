import { D1Client } from "@effect/sql-d1"
import { Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/http"
import { ApiRoutes } from "./handlers.ts"

export interface Env { readonly DB: D1Database }

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    ApiRoutes.pipe(
      Layer.provide(D1Client.layer({ db: env.DB })),
      Layer.provide(HttpServer.layerServices)
    )
  )

let cached: ReturnType<typeof build> | undefined

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    cached ??= build(env)
    return cached.handler(request)
  }
}
