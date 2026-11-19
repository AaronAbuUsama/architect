import { PortalRender } from "#modules/portal/service.js";
import type { RenderApi } from "./types.ts";
import { renderApi } from "./internal/api.ts";
import { renderHandlerTypes } from "./internal/calls.ts";
import { renderCli } from "./internal/cli.ts";
import { renderDocs, renderEdges } from "./internal/docs.ts";
import { renderMcp } from "./internal/mcp.ts";
import { renderHandlerScaffold } from "./internal/scaffold.ts";
import { renderSdk } from "./internal/sdk.ts";
import { renderServer } from "./internal/server.ts";
import { serverModel } from "./internal/names.ts";

export const Render: RenderApi = {
  files: ({ name, model }) => {
    const docs = renderDocs(model, name);
    // What runs on the device has no route, handler or tool: the server, the API and MCP see the rest.
    const served = serverModel(model);
    return [
      { path: "generated/model/model.json", content: JSON.stringify(model, null, 2) + "\n", scaffold: false },
      renderEdges(model),
      ...docs,
      ...PortalRender.files({ name, model, docs }),
      ...renderApi(model, name, served),
      ...renderServer(served, name),
      ...renderHandlerTypes(served),
      ...renderMcp(served),
      ...renderSdk(model, name),
      ...renderCli(model, name),
      // A plugin's handlers are in its package: the project's src/ gains nothing for them (M1-plugins section 8).
      ...Object.values(model.operations).filter((op) => op.kind === "operation" && !op.from).map((op) => renderHandlerScaffold(op)),
    ];
  },
  emptyServer: ({ name, model }) => renderServer(serverModel(model), name, true),
};
