import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import type { BlueprintWire, RenderSite, Section } from "./types.ts";
import { Environments, OperationTable, Overview, Things } from "./internal/catalog.tsx";
import { OperationDetail, ThingDetail } from "./internal/details.tsx";
import { link } from "./internal/links.ts";
export { projectActivity } from "./internal/calls.ts";
import { Shell } from "./internal/shell.tsx";

const page = (blueprint: BlueprintWire, section: Section, title: string, children: ReactNode, detail?: string | undefined) => {
  const path = link(section, detail);
  const base = "../".repeat(path.split("/").length - 1);
  const html = renderToStaticMarkup(
    <html lang="en" className="dark" data-theme="dark" data-blueprint-digest={blueprint.digest}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · ${blueprint.project} · Architect`}</title>
        <link rel="stylesheet" href={base + "portal.css"} />
      </head>
      <body>
        <a className="skip-link" href="#content">Skip to content</a>
        <Shell blueprint={blueprint} base={base} section={section} detail={detail}>{children}</Shell>
      </body>
    </html>,
  );
  return { path, html: "<!doctype html>\n" + html + "\n" };
};

export const renderSite: RenderSite = (blueprint, activity) => {
  const { model } = blueprint;
  return [
    page(blueprint, "overview", "Overview", <Overview blueprint={blueprint} />),
    page(blueprint, "things", "Things", <>
      <header className="page-heading"><h1>Things</h1></header><Things model={model} base="../" />
    </>),
    page(blueprint, "operations", "Operations", <>
      <header className="page-heading"><h1>Operations</h1><p>Operations and reads declared by {blueprint.project}.</p></header>
      <OperationTable operations={Object.values(model.operations)} base="../" blueprint={blueprint} activity={activity} />
    </>),
    page(blueprint, "environments", "Environments", <Environments model={model} />),
    ...Object.values(model.things).map((thing) =>
      page(blueprint, "things", thing.name, <ThingDetail thing={thing} blueprint={blueprint} base="../../" />, thing.name)),
    ...Object.values(model.operations).map((operation) =>
      page(blueprint, "operations", operation.name, <OperationDetail operation={operation} blueprint={blueprint} base="../../" activity={activity} />, operation.name)),
  ];
};
