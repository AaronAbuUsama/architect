import { Effect } from "effect";
import { emptyServer, renderHandlerScaffold, serverModel } from "@orthograph/projections/shared";
import { PortalRender } from "#modules/portal/service.js";
import type { RenderApi } from "./types.ts";
import { renderCli } from "./internal/cli.ts";
import { renderDocs } from "./internal/docs.ts";
import { filesOf, mountedIn } from "./internal/mounted.ts";
import { renderMcp } from "./internal/mcp.ts";
import { renderSdk } from "./internal/sdk.ts";

export const Render: RenderApi = {
  files: ({ name, model, root }) =>
    Effect.gen(function* () {
      // What a mount makes is what a projection renders from it: the model, the api and the server are mounted (M1.11).
      const mounted = yield* mountedIn(root, model);
      const made = yield* Effect.forEach(mounted, (m) => filesOf(name, model, m));
      const docs = renderDocs(model, name);
      // What runs on the device has no route, handler or tool: the server, the API and MCP see the rest.
      const served = serverModel(model);
      return [
        ...made.flat(),
        ...docs,
        ...PortalRender.files({ name, model, docs }),
        ...renderMcp(served),
        ...renderSdk(model, name),
        ...renderCli(model, name),
        // A plugin's handlers are in its package: the project's src/ gains nothing for them (M1-plugins section 8).
        ...Object.values(model.operations).filter((op) => op.kind === "operation" && op.from.kind === "app").map((op) => renderHandlerScaffold(op, undefined, model)),
      ];
    }),
  emptyServer: ({ name, model }) => emptyServer(model, name),
};
