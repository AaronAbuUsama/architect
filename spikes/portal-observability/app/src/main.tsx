// Entry: the shell (HeroUI Pro's AppLayout, Sidebar, Navbar) around whichever page the hash names.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppLayout } from "@heroui-pro/react/app-layout";
import { Navbar } from "@heroui-pro/react/navbar";
import { Segment } from "@heroui-pro/react/segment";
import { Sidebar } from "@heroui-pro/react/sidebar";
import "./app.css";
import { href, useFeed, useRoute } from "./ui/index.ts";
import { MatrixScreen, OperationScreen } from "./ui/pages.tsx";

const WINDOWS = { "15m": 15 * 60_000, "30m": 30 * 60_000, "1h": 60 * 60_000 } as const;

const App = () => {
  const [source, setSource] = useState<"file" | "tempo">(() => (new URLSearchParams(window.location.search).get("source") === "tempo" ? "tempo" : "file"));
  const [win, setWin] = useState<keyof typeof WINDOWS>("30m");
  const feed = useFeed(source, WINDOWS[win]);
  const route = useRoute();
  const current = route.path[0] === "operations" && route.path[1] ? route.path[1] : undefined;
  const model = feed.model;

  const sidebar = (
    <Sidebar>
      <Sidebar.Header>
        <span className="mono px-1 py-2 text-sm font-semibold">forman·portal <span className="text-muted">acme</span></span>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label="operations" defaultExpandedKeys={model ? Object.keys(model.things) : []}>
            <Sidebar.MenuItem id="matrix" href={href("operations")} isCurrent={!current} textValue="Operations">
              <Sidebar.MenuLabel>Operations</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
            {model
              ? Object.keys(model.things).filter((t) => Object.values(model.operations).some((o) => o.thing === t)).map((thing) => (
                  <Sidebar.MenuItem key={thing} id={thing} textValue={thing}>
                    <Sidebar.MenuLabel>
                      <span className="mono">{thing}</span>
                      <Sidebar.MenuTrigger><Sidebar.MenuIndicator /></Sidebar.MenuTrigger>
                    </Sidebar.MenuLabel>
                    <Sidebar.Submenu>
                      {Object.values(model.operations).filter((o) => o.thing === thing).map((o) => (
                        <Sidebar.MenuItem key={o.name} id={o.name} href={href(`operations/${o.name}`)} isCurrent={o.name === current} textValue={o.name}>
                          <Sidebar.MenuLabel><span className="mono">{o.verb}</span></Sidebar.MenuLabel>
                        </Sidebar.MenuItem>
                      ))}
                    </Sidebar.Submenu>
                  </Sidebar.MenuItem>
                ))
              : null}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
    </Sidebar>
  );

  const navbar = (
    <Navbar position="static">
      <Navbar.Header>
        <span className="mono text-xs text-muted">
          <a href={href("operations")}>operations</a>
          {current ? <> / <span className="text-foreground">{current}</span></> : null}
        </span>
        <Navbar.Spacer />
        <Segment selectedKey={source} onSelectionChange={(k) => setSource(k as "file" | "tempo")} size="sm">
          <Segment.Item id="file">files</Segment.Item>
          <Segment.Item id="tempo">tempo</Segment.Item>
        </Segment>
        <Segment selectedKey={win} onSelectionChange={(k) => setWin(k as keyof typeof WINDOWS)} size="sm">
          {Object.keys(WINDOWS).map((w) => <Segment.Item key={w} id={w}>{w}</Segment.Item>)}
        </Segment>
        <span className="mono flex items-center gap-1.5 text-xs text-muted">
          <span className={`inline-block size-2 rounded-full ${feed.error ? "bg-danger" : "bg-success"}`} />
          {feed.error ? feed.error : `live · ${feed.timing ? Math.round(feed.timing["totalMs"] ?? 0) : "…"} ms query`}
        </span>
      </Navbar.Header>
    </Navbar>
  );

  return (
    <AppLayout navbar={navbar} sidebar={sidebar}>
      {!model || !feed.telemetry ? (
        <p className="p-6 text-muted">{feed.error ?? "loading the model and the telemetry…"}</p>
      ) : current ? (
        <OperationScreen model={model} telemetry={feed.telemetry} journeys={feed.journeys} name={current} trace={route.query["trace"]} span={route.query["span"]} />
      ) : (
        <MatrixScreen model={model} telemetry={feed.telemetry} journeys={feed.journeys} />
      )}
    </AppLayout>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
