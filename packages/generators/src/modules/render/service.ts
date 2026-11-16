import type { RenderApi } from "./types.ts";
import { renderApi } from "./internal/api.ts";
import { renderCli } from "./internal/cli.ts";
import { renderDocs, renderEdges } from "./internal/docs.ts";
import { renderHandlerScaffold } from "./internal/scaffold.ts";
import { renderSdk } from "./internal/sdk.ts";
import { renderServer } from "./internal/server.ts";

export const Render: RenderApi = {
  files: ({ name, model }) => [
    { path: "generated/model/model.json", content: JSON.stringify(model, null, 2) + "\n", scaffold: false },
    renderEdges(model),
    ...renderDocs(model, name),
    ...renderApi(model, name),
    ...renderServer(model, name),
    ...renderSdk(model, name),
    ...renderCli(model, name),
    ...Object.values(model.operations).filter((op) => op.kind === "operation").map(renderHandlerScaffold),
  ],
};
