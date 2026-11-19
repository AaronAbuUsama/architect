// What ⌘K searches: the model, by kind. Built on the server and handed to the palette as data.
import { journeys } from "../journeys.ts";
import { environments, model, operations, page, things } from "../model.ts";
import type { CmdGroup } from "./command-palette.tsx";

export const commandGroups = (): CmdGroup[] => [
  { heading: "Things", items: things.map((t) => ({ label: t.name, href: page.thing(t.name) })) },
  { heading: "Operations", items: operations.map((o) => ({ label: o.name, href: page.op(o.name), hint: o.kind === "read" ? "read" : "changes state" })) },
  { heading: "Journeys", items: journeys.map((j) => ({ label: j.name, href: `journey-${j.slug}.html`, hint: `${j.steps.length} steps` })) },
  { heading: "Blueprint", items: [
    { label: "Environments", href: "environments.html" }, { label: "Machines", href: "machines.html" }, { label: "Access", href: "access.html" },
    { label: "Events", href: "events.html" }, { label: "Values", href: "values.html" }, { label: "Plugins", href: "plugins.html" }, { label: "Stores", href: "stores.html" }] },
  { heading: "Refusal codes", items: Object.entries(model.refusals).map(([name, code]) => ({ label: name, href: `refusals.html#${name}`, hint: code })) },
  { heading: "Environments", items: environments.map((e) => ({ label: e.name, href: "environments.html", hint: e.runs })) },
  { heading: "Monitor", items: [{ label: "Issues", href: "issues.html" }, { label: "Alerts", href: "alerts.html" }] },
];
