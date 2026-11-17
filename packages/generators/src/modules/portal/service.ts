import { Wire, type ModelWire } from "@formants/portal";
import type { PortalRenderApi } from "./types.ts";
import { renderMain } from "./internal/main.ts";

const DOCS = "generated/docs/";

export const PortalRender: PortalRenderApi = {
  files: ({ name, model, docs }) => [
    {
      path: "generated/portal/blueprint.json",
      scaffold: false,
      content: JSON.stringify(
        Wire.build({
          project: name,
          model: model as unknown as ModelWire,
          docs: Object.fromEntries(docs.filter((d) => d.path.startsWith(DOCS)).map((d) => [d.path.slice(DOCS.length), d.content])),
        }),
        null,
        2,
      ) + "\n",
    },
    renderMain(),
  ],
};
