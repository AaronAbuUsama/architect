// generated/sdk: a typed client. One function per operation; refusals arrive as their own classes.
import type { Model } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, camel, lines, pascal } from "./names.ts";

export const renderSdk = (model: Model, name: string): ReadonlyArray<RenderedFile> => {
  const ops = Object.values(model.operations);
  const things = [...new Set(ops.map((o) => o.thing))];
  const client = pascal(name);
  const perOp = ops.map((o): RenderedFile => ({
    path: `generated/sdk/src/${o.thing}/${o.verb}.ts`,
    scaffold: false,
    content: lines(
      GENERATED,
      `import { Effect } from "effect";`,
      `import type { PayloadOf } from "@architect/blueprint";`,
      `import type { declaration } from "../../../api/src/${o.thing}/${o.verb}.ts";`,
      `import { ${client} } from "../client.ts";`,
      "",
      `/** ${o.description} */`,
      `export const ${camel(o.verb)} = (payload: PayloadOf<typeof declaration>) =>`,
      `  Effect.flatMap(${client}, (client) => client.${o.thing}.${o.verb}({ payload }));`,
    ),
  }));
  const clientFile: RenderedFile = {
    path: "generated/sdk/src/client.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      `import { Context, Layer } from "effect";`,
      `import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";`,
      `import { HttpApiClient } from "effect/http-api";`,
      `import { Api } from "../../api/src/index.ts";`,
      "",
      `export class ${client} extends Context.Service<${client}, HttpApiClient.ForApi<typeof Api>>()("${name}/Client") {}`,
      "",
      "/** A client for the server at `baseUrl`, signed in with `token` when there is one. */",
      `export const layer = (baseUrl: string, token?: string) =>`,
      `  Layer.effect(${client}, HttpApiClient.make(Api, {`,
      "    transformClient: HttpClient.mapRequest((request) => {",
      "      const at = HttpClientRequest.prependUrl(request, baseUrl);",
      "      return token ? HttpClientRequest.bearerToken(at, token) : at;",
      "    }),",
      "  })).pipe(Layer.provide(FetchHttpClient.layer));",
    ),
  };
  const index: RenderedFile = {
    path: "generated/sdk/src/index.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      `export { ${client}, layer } from "./client.ts";`,
      `export { Errors } from "../../api/src/index.ts";`,
      things.map((t) => `export * as ${camel(t)} from "./${t}/index.ts";`),
    ),
  };
  const thingIndexes = things.map((t): RenderedFile => ({
    path: `generated/sdk/src/${t}/index.ts`,
    scaffold: false,
    content: lines(GENERATED, ops.filter((o) => o.thing === t).map((o) => `export { ${camel(o.verb)} } from "./${o.verb}.ts";`)),
  }));
  return [clientFile, index, ...thingIndexes, ...perOp];
};
