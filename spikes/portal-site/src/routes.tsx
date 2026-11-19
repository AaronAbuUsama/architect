// Every page of the site, by file name. Things and operations get their pages from the model: one per declaration.
import type { ReactElement } from "react";
import { highlight } from "./code.tsx";
import { journeys, worlds } from "./journeys.ts";
import { operations, page, things } from "./model.ts";
import { mounts } from "./overlay.ts";
import { BlankOp } from "./pages/blank.tsx";
import { Home } from "./pages/home.tsx";
import { Issues, Alerts, About } from "./pages/monitor.tsx";
import { Contract } from "./pages/op.tsx";
import { Docs, Metrics, Notes, Proof, Spans } from "./pages/op-tabs.tsx";
import { Environments, EnvProof, Plugin, Plugins, Stores } from "./pages/places.tsx";
import { JourneyPage, Journeys, WorldPage } from "./pages/proving.tsx";
import { Access, Events, Machines, Refusals, Values } from "./pages/reference.tsx";
import { ThingPage } from "./pages/thing.tsx";
import { EnvPage, Options, PluginsAndStores, StillBlank } from "./pages/options.tsx";
import { WithOpt, type Opt } from "./opt.tsx";
import { Components } from "./pages/components.tsx";

const opt = (o: Partial<Opt>, title: string, el: ReactElement): Route => ({ title, el: <WithOpt opt={o}>{el}</WithOpt> });
const optionPages = (): Record<string, Route> => ({
  "options.html": { title: "Round 3 options", el: <Options /> },
  "q1-a.html": opt({ label: "Q1 · A · one sidebar, sections" }, "Q1 A", <Home />),
  "q1-b.html": opt({ nav: "b", label: "Q1 · B · icon rail swaps the sidebar" }, "Q1 B", <Home />),
  "q1-b-proof.html": opt({ nav: "b", label: "Q1 · B · icon rail swaps the sidebar" }, "Q1 B", <Journeys />),
  "q1-c.html": opt({ nav: "c", overlay: "command", label: "Q1 · C · things only, ⌘K for the rest" }, "Q1 C", <Home />),
  "q2-a.html": opt({ label: "Q2 · A · pick one, compare the rest" }, "Q2 A", <Environments />),
  "q2-b.html": opt({ env: "b", label: "Q2 · B · a page per environment" }, "Q2 B", <EnvPage />),
  "q2-c.html": opt({ env: "c", overlay: "env-menu", label: "Q2 · C · the switcher's menu only" }, "Q2 C", <Home />),
  "q3-a.html": opt({ label: "Q3 · A · a page per plugin, and Stores" }, "Q3 A", <Plugin name="handles" />),
  "q3-b.html": opt({ plugins: "b", label: "Q3 · B · one list page" }, "Q3 B", <PluginsAndStores />),
  "q3-c.html": opt({ plugins: "c", label: "Q3 · C · labels only" }, "Q3 C", <ThingPage name="handle" />),
  "q6-a.html": opt({ label: "Q6 · A · in the tree, greyed" }, "Q6 A", <BlankOp />),
  "q6-b.html": opt({ blank: "b", label: "Q6 · B · one Still blank page" }, "Q6 B", <StillBlank />),
  "q6-c.html": opt({ blank: "c", label: "Q6 · C · hidden until filled" }, "Q6 C", <ThingPage name="link" />),
});

export type Route = { title: string; el: ReactElement };

export const routes = async (): Promise<Record<string, Route>> => {
  const r: Record<string, Route> = {
    "home.html": { title: "Home", el: <Home /> },
    "machines.html": { title: "Machines", el: <Machines /> },
    "refusals.html": { title: "Refusal codes", el: <Refusals /> },
    "access.html": { title: "Access", el: <Access /> },
    "events.html": { title: "Events", el: <Events /> },
    "values.html": { title: "Values", el: <Values /> },
    "environments.html": { title: "Environments", el: <Environments /> },
    "environments-proof.html": { title: "Proof matrix", el: <EnvProof /> },
    "plugins.html": { title: "Plugins", el: <Plugins /> },
    "stores.html": { title: "Stores", el: <Stores /> },
    "journeys.html": { title: "Journeys", el: <Journeys /> },
    "op-link.pin.html": { title: "link.pin", el: <BlankOp /> },
    "issues.html": { title: "Issues", el: <Issues /> },
    "alerts.html": { title: "Alerts", el: <Alerts /> },
    "about.html": { title: "About this drawing", el: <About /> },
  };
  Object.assign(r, optionPages());
  r["components.html"] = { title: "Components", el: <Components /> };
  for (const t of things) r[page.thing(t.name)] = { title: t.name, el: <ThingPage name={t.name} /> };
  for (const m of Object.keys(mounts) as (keyof typeof mounts)[]) r[`plugin-${m}.html`] = { title: m, el: <Plugin name={m} /> };
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
    r[page.op(o.name, "spans")] = { title: `${o.name} spans`, el: <Spans o={o} /> };
    r[page.op(o.name, "proof")] = { title: `${o.name} proof`, el: <Proof o={o} /> };
    r[page.op(o.name, "docs")] = { title: `${o.name} docs`, el: <Docs o={o} code={code} /> };
    r[page.op(o.name, "notes")] = { title: `${o.name} notes`, el: <Notes o={o} /> };
  }
  return r;
};
