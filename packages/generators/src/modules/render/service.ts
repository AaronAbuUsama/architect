import { PortalRender } from "#modules/portal/service.js";
import type { RenderApi } from "./types.ts";
import { renderApi } from "./internal/api.ts";
import { renderCli } from "./internal/cli.ts";
import { renderDocs, renderEdges } from "./internal/docs.ts";
import { renderMcp } from "./internal/mcp.ts";
import { renderHandlerScaffold } from "./internal/scaffold.ts";
import { renderSdk } from "./internal/sdk.ts";
import { renderServer } from "./internal/server.ts";

export const Render: RenderApi = {
  files: ({ name, model }) => {
    const docs = renderDocs(model, name);
    return [
      { path: "generated/model/model.json", content: JSON.stringify(model, null, 2) + "\n", scaffold: false },
      renderEdges(model),
      ...docs,
      ...PortalRender.files({ name, model, docs }),
      ...renderApi(model, name),
      ...renderServer(model, name),
      ...renderMcp(model),
      ...renderSdk(model, name),
      ...renderCli(model, name),
      // A plugin's handlers are in its package: the project's src/ gains nothing for them (M1-plugins section 8).
      ...Object.values(model.operations).filter((op) => op.kind === "operation" && !op.from).map(renderHandlerScaffold),
    ];
  },
};
