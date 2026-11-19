// Every page of the site, by file name. Things and operations get their pages from the model: one per declaration.
import type { ReactElement } from "react";
import { highlight } from "./code.tsx";
import { journeys, worlds } from "./journeys.ts";
import { environments, operations, page, things } from "./model.ts";
import { BlankOp } from "./pages/blank.tsx";
import { Home } from "./pages/home.tsx";
import { Issues, Alerts, About } from "./pages/monitor.tsx";
import { Contract } from "./pages/op.tsx";
import { Docs, Metrics, Notes, Proof } from "./pages/op-tabs.tsx";
import { Environments, EnvPage, envPage, PluginsAndStores } from "./pages/places.tsx";
import { JourneyPage, Journeys, WorldPage } from "./pages/proving.tsx";
import { Access, Events, Machines, Refusals, Values } from "./pages/reference.tsx";
import { ThingPage } from "./pages/thing.tsx";
import { Components } from "./pages/components.tsx";
import { Graphs } from "./pages/graphs.tsx";
import { allGraphs } from "../../react-flow-graphs/src/views/all.ts";

export type Route = { title: string; el: ReactElement };

export const routes = async (): Promise<Record<string, Route>> => {
  const r: Record<string, Route> = {
    "home.html": { title: "Home", el: <Home /> },
    "machines.html": { title: "Machines", el: <Machines /> },
    "refusals.html": { title: "Refusal codes", el: <Refusals /> },
    "access.html": { title: "Access", el: <Access /> },
    "events.html": { title: "Events", el: <Events /> },
    "values.html": { title: "Values", el: <Values /> },
    "environments.html": { title: "Compare environments", el: <Environments /> },
    "plugins.html": { title: "Plugins and stores", el: <PluginsAndStores /> },
    "journeys.html": { title: "Journeys", el: <Journeys /> },
    "op-link.pin.html": { title: "link.pin", el: <BlankOp /> },
    "issues.html": { title: "Issues", el: <Issues /> },
    "alerts.html": { title: "Alerts", el: <Alerts /> },
    "about.html": { title: "About this drawing", el: <About /> },
  };
  r["components.html"] = { title: "Components", el: <Components /> };
  r["graphs.html"] = { title: "Graphs", el: <Graphs g={await allGraphs()} /> };
  for (const t of things) r[page.thing(t.name)] = { title: t.name, el: <ThingPage name={t.name} /> };
  for (const e of environments) r[envPage(e.name)] = { title: e.name, el: <EnvPage name={e.name} /> };
  for (const j of journeys) r[`journey-${j.slug}.html`] = { title: j.name, el: <JourneyPage j={j} /> };
  for (const w of worlds) r[`world-${w.slug}.html`] = { title: w.slug, el: <WorldPage w={w} /> };
  for (const o of operations) {
    const [service, verb] = o.name.split(".");
    const keys = Object.keys(o.payload).map((k) => `${k}: …`).join(", ");
    const sdk = `const answer = yield* PluggedIn.${service}.${verb!.replace(/-(\w)/g, (_, c) => c.toUpperCase())}({ ${keys} })`;
    const cli = `plugged-in ${service} ${verb} ${Object.keys(o.payload).map((k) => `--${k} …`).join(" ")}`.trim();
    const code = { sdk, cli, sdkHtml: await highlight(sdk, "ts"), cliHtml: await highlight(cli, "bash") };
    r[page.op(o.name)] = { title: o.name, el: <Contract o={o} /> };
    r[page.op(o.name, "metrics")] = { title: `${o.name} metrics`, el: <Metrics o={o} /> };
    r[page.op(o.name, "proof")] = { title: `${o.name} proof`, el: <Proof o={o} /> };
    r[page.op(o.name, "docs")] = { title: `${o.name} docs`, el: <Docs o={o} code={code} /> };
    r[page.op(o.name, "notes")] = { title: `${o.name} notes`, el: <Notes o={o} /> };
  }
  return r;
};
