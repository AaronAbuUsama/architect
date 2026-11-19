// The bundle's entry: `window.MissionBoard.mount(el, options)`. The Design artboard calls it with the data's URLs and
// the two switches; the local preview calls it with the data inline. React 19 runs in its own root inside the artboard.
import { createRoot, type Root } from "react-dom/client";
import type { Board, CellId, Grid } from "../data/types.ts";
import { StoryBrowser } from "../browser/StoryBrowser.tsx";
import type { ColumnsBy, DetailAt } from "../components/shared/vocab.ts";
import { Page, type Tab } from "./page.tsx";

export interface MountOptions {
  readonly grid: Grid | string;   // the data, or a URL to fetch it from
  readonly board: Board | string;
  readonly columns?: ColumnsBy;
  readonly detail?: DetailAt;
  readonly tab?: Tab | "components";
  readonly component?: string; // the Components view: which component opens first
  readonly open?: CellId | null;
}

const load = <A,>(x: A | string): Promise<A> =>
  typeof x === "string" ? fetch(x).then((r) => r.json() as Promise<A>) : Promise.resolve(x);

const roots = new WeakMap<Element, Root>();

export const mount = (el: Element, o: MountOptions): Promise<void> =>
  Promise.all([load(o.grid), load(o.board)]).then(([grid, board]) => {
    const html = el.ownerDocument.documentElement; // dark reaches portals (the modal) too
    html.classList.add("dark");
    html.setAttribute("data-theme", "dark");
    const root = roots.get(el) ?? createRoot(el);
    roots.set(el, root);
    // A repeated mount (an artboard switch changed) keys the page by its starting state, so React starts it afresh
    // instead of keeping the old tab and open card in useState.
    root.render(o.tab === "components" ? <StoryBrowser key={o.component ?? ""} initial={o.component} /> : (
      <Page key={`${o.tab ?? "board"}|${o.open ?? ""}`} grid={grid} board={board} columns={o.columns ?? "state"} detail={o.detail ?? "panel"}
        tab={o.tab ?? "board"} open={o.open ?? null} />
    ));
  });

(globalThis as { MissionBoard?: unknown }).MissionBoard = { mount };
