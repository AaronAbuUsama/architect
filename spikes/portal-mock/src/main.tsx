// Entry: ?page=home | thing&thing=handle | op&thing=handle&op=handle.claim, with &drawer=trace | chat, &theme=light.
import "./app.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { sumStat, things } from "./data.ts";
import { Home, OperationPage, ThingPage } from "./pages.tsx";
import { ChatDrawer, Rail, TraceDrawer } from "./rail.tsx";
import { Shell, type Here } from "./shell.tsx";

const q = new URLSearchParams(window.location.search);
const here: Here = { page: (q.get("page") as Here["page"]) ?? "home", thing: q.get("thing") ?? undefined, op: q.get("op") ?? undefined };
const light = q.get("theme") === "light";
document.documentElement.classList.toggle("dark", !light);
document.documentElement.dataset.theme = light ? "light" : "dark";

function App() {
  const [drawer, setDrawer] = useState<string | null>(q.get("drawer"));
  const t = things[here.thing ?? "handle"]!;
  const allStat = Object.values(things).map(sumStat).reduce((a, s) => ({ calls: a.calls + s.calls, answered: a.answered + s.answered,
    refused: a.refused + s.refused, defects: a.defects + s.defects, p95: Math.max(a.p95, s.p95) }));
  const scope = here.page === "home" ? "everything" : here.page === "thing" ? t.name : (here.op ?? t.ops[0]!.name);
  const stat = here.page === "home" ? allStat : here.page === "thing" ? sumStat(t) : t.ops[0]!.stat;
  const close = () => setDrawer(null);
  const rail = drawer === "trace" ? <TraceDrawer onClose={close} /> : drawer === "chat" ? <ChatDrawer onClose={close} />
    : <Rail scope={scope} stat={stat} runs={here.page !== "home" && t.name === "handle"} />;
  const title = here.page === "home" ? "links" : here.page === "thing" ? t.name : here.op;
  const sub = here.page === "home" ? "things first · local · last 30 min" : here.page === "thing" ? `${t.group} · thing` : `${t.name} · operation`;
  return (
    <Shell key={drawer ?? "rail"} railSize={drawer ? 460 : 340} here={here} title={title} sub={sub} rail={rail} onChat={() => setDrawer("chat")}>
      {here.page === "home" ? <Home /> : here.page === "thing" ? <ThingPage t={t} /> : <OperationPage t={t} onTrace={() => setDrawer("trace")} />}
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
