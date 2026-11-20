// The portal's client: a route is read from the path, the data from `/_portal/v1/*`, and the page is drawn once both are in.
import { Effect } from "effect";
import { useEffect, useState } from "react";
import type { Loaded, Route } from "../types.ts";
import { Home } from "./home.tsx";
import { load } from "./load.ts";
import { OperationPage } from "./operation.tsx";
import { Page } from "./parts.tsx";
import { routeOf } from "./route.ts";
import { ThingPage } from "./thing.tsx";

const NotFound = () => <Page status={404}><h1>Not found</h1><p><a href="/portal">The portal</a></p></Page>;

const Drawn = ({ route, loaded }: { readonly route: Route; readonly loaded: Loaded }) => {
  if (loaded.state === "loading") return <Page status={200} ready={false}><p>Loading</p></Page>;
  if (loaded.state === "failed") {
    return <Page status={502}><h1>The portal could not read its data</h1><p className="banner">{`${loaded.failure.request}: ${loaded.failure.reason}. Nothing here is a proof.`}</p></Page>;
  }
  const { data } = loaded;
  if (route.page === "home") return <Home data={data} />;
  if (route.page === "thing") {
    const thing = data.blueprint.model.things[route.name];
    return thing === undefined ? <NotFound /> : <ThingPage data={data} thing={thing} />;
  }
  if (route.page === "operation") {
    const op = data.blueprint.model.operations[route.name];
    return op === undefined ? <NotFound /> : <OperationPage data={data} op={op} />;
  }
  return <NotFound />;
};

/** The whole client: the one component the browser entry mounts. */
export const App = ({ pathname }: { readonly pathname: string }) => {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void Effect.runPromise(load().pipe(Effect.match({
      onSuccess: (data): Loaded => ({ state: "ready", data }),
      onFailure: (failure): Loaded => ({ state: "failed", failure }),
    }))).then((next) => { if (live) setLoaded(next); });
    return () => { live = false; };
  }, []);
  return <Drawn route={routeOf(pathname)} loaded={loaded} />;
};
