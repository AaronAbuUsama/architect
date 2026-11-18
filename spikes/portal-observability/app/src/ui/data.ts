// The only place the browser fetches: the model once, the telemetry query on a timer. Everything else is derived.
import { useEffect, useState } from "react";
import type { JourneyRef, Model, Telemetry } from "../page/model.ts";

export interface Feed {
  readonly model?: Model;
  readonly journeys: ReadonlyArray<JourneyRef>;
  readonly telemetry?: Telemetry;
  readonly timing?: Record<string, number>;
  readonly error?: string;
  readonly fetchedAt?: number;
}

const json = <A,>(url: string): Promise<A> =>
  fetch(url).then((r) => r.json().then((b) => (r.ok ? (b as A) : Promise.reject(new Error((b as { error?: string }).error ?? r.statusText)))));

export const useFeed = (source: string, since: number, every = 3000): Feed => {
  const [feed, setFeed] = useState<Feed>({ journeys: [] });
  useEffect(() => {
    Promise.all([json<Model>("/api/model"), json<ReadonlyArray<JourneyRef>>("/api/journeys")]).then(
      ([model, journeys]) => setFeed((f) => ({ ...f, model, journeys })),
      (e: Error) => setFeed((f) => ({ ...f, error: e.message })),
    );
  }, []);
  useEffect(() => {
    let live = true;
    const tick = () =>
      json<Telemetry & { timing: Record<string, number> }>(`/api/telemetry?source=${source}&since=${since}`).then(
        (t) => live && setFeed((f) => {
          const { error: _e, ...rest } = f;
          return { ...rest, telemetry: t, timing: t.timing, fetchedAt: t.now };
        }),
        (e: Error) => live && setFeed((f) => ({ ...f, error: e.message })),
      );
    tick();
    const id = setInterval(tick, every);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [source, since, every]);
  return feed;
};

/** `#/allowance/spend?trace=…&span=…` */
export interface Route {
  readonly path: ReadonlyArray<string>;
  readonly query: Readonly<Record<string, string>>;
}

const parse = (): Route => {
  const [path = "", q = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  return { path: path.split("/").filter(Boolean), query: Object.fromEntries(new URLSearchParams(q)) };
};

export const useRoute = (): Route => {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
};

export const href = (path: string, query: Record<string, string | undefined> = {}) => {
  const q = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => e[1] !== undefined)).toString();
  return `#/${path}${q ? `?${q}` : ""}`;
};
