import { Render } from "@orthograph/portal-ui";
import { createElement } from "react";
import { Home } from "./internal/home.tsx";
import { JourneysPage } from "./internal/journeys.tsx";
import { OperationPage } from "./internal/operation.tsx";
import { ReferencePage } from "./internal/reference.tsx";
import { ThingPage } from "./internal/thing.tsx";
import { TracePage } from "./internal/trace.tsx";
import { Frame } from "./internal/frame.tsx";
import { none } from "./internal/stats.ts";
import type { PagesApi } from "./types.ts";

export const Pages: PagesApi = {
  home: (data, snapshot) => Render.document(createElement(Home, { data, snapshot })),
  thing: (data, thing) => Render.document(createElement(ThingPage, { data, thing })),
  operation: (data, snapshot, op) => Render.document(createElement(OperationPage, { data, snapshot, op })),
  trace: (data, id, found) => Render.document(createElement(TracePage, { data, id, found })),
  journeys: (data) => Render.document(createElement(JourneysPage, { data })),
  reference: (data, kind) => Render.document(createElement(ReferencePage, { data, kind })),
  notFound: (data) => Render.document(createElement(Frame, { data, title: "Not found", here: { id: "none" }, crumbs: [data.blueprint.project, "Not found"], scope: { id: "all", operations: "all", stat: none }, children: createElement("h1", null, "Not found") })),
};
