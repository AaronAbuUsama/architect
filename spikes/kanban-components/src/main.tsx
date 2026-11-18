// Entry: pick a case from the query string. ?case=decided | stock | actions | lanes | scale (&n=2000&virtual=1) (&agents=1)
import "./app.css";
import { createRoot } from "react-dom/client";
import { Actions } from "./actions.tsx";
import { Decided } from "./decided.tsx";
import { Scale } from "./scale.tsx";
import { Stock } from "./stock.tsx";

const q = new URLSearchParams(window.location.search);
const which = q.get("case") ?? "actions";
const started = performance.now();

const view = which === "decided" ? <Decided />
  : which === "stock" ? <Stock />
  : which === "scale" ? <Scale count={Number(q.get("n") ?? 2000)} virtual={q.get("virtual") === "1"} />
  : <Actions lanes={which === "lanes"} agents={q.get("agents") === "1"} />;

document.documentElement.classList.add("dark");
document.documentElement.dataset.theme = "dark";
createRoot(document.getElementById("root")!).render(<main className="min-h-screen bg-background p-4 text-foreground">{view}</main>);
// The first paint after React commits: a rough render time for the case, read by the driver.
requestAnimationFrame(() => setTimeout(() => {
  (window as unknown as { __rendered: number }).__rendered = Math.round(performance.now() - started);
}, 0));
