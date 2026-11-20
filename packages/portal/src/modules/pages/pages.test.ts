// The route the client draws from the path, and the data it reads. The drawing itself is read in a browser (check 21, the grid).
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { load } from "./internal/load.ts";
import { routeOf } from "./internal/route.ts";

afterEach(() => { vi.unstubAllGlobals(); });

describe("routeOf", () => {
  it("home, a thing and an operation, with or without a trailing slash", () => {
    expect(routeOf("/portal")).toEqual({ page: "home" });
    expect(routeOf("/portal/")).toEqual({ page: "home" });
    expect(routeOf("/portal/things/handle")).toEqual({ page: "thing", name: "handle" });
    expect(routeOf("/portal/operations/handle.claim/")).toEqual({ page: "operation", name: "handle.claim", tab: "contract" });
  });

  it("an operation's tab is the query's, and a tab that is not one is the contract", () => {
    expect(routeOf("/portal/operations/handle.claim", "?tab=metrics")).toEqual({ page: "operation", name: "handle.claim", tab: "metrics" });
    expect(routeOf("/portal/operations/handle.claim", "?tab=spans")).toEqual({ page: "operation", name: "handle.claim", tab: "contract" });
  });

  it("the other pages: an environment, the lists, the reference, a trace", () => {
    expect(routeOf("/portal/environments/local")).toEqual({ page: "environment", name: "local" });
    expect(routeOf("/portal/plugins")).toEqual({ page: "plugins" });
    expect(routeOf("/portal/journeys")).toEqual({ page: "journeys" });
    expect(routeOf("/portal/reference/refusals")).toEqual({ page: "reference", kind: "refusals" });
    expect(routeOf("/portal/reference/nothing")).toEqual({ page: "missing" });
    expect(routeOf("/portal/traces/0123456789abcdef")).toEqual({ page: "trace", id: "0123456789abcdef" });
    expect(routeOf("/portal/traces/xyz")).toEqual({ page: "missing" });
  });

  it("anything else is not a page, and a name with a path in it is no name", () => {
    for (const path of ["/portal/nothing", "/portal/things", "/portal/things/a/b", "/portal/things/..%2Fsecret", "/portal/things/%E0%A4%A", "/portal/things/Handle", "/elsewhere"]) {
      expect(routeOf(path), path).toEqual({ page: "missing" });
    }
  });
});

describe("load", () => {
  it("reads the blueprint, then the snapshot for its digest", async () => {
    const asked: Array<string> = [];
    vi.stubGlobal("fetch", (path: string) => {
      asked.push(path);
      return Promise.resolve(Response.json(path.includes("blueprint") ? { digest: "abc" } : { consistency: "checked" }));
    });
    expect(await Effect.runPromise(load())).toEqual({ blueprint: { digest: "abc" }, snapshot: { consistency: "checked" } });
    expect(asked).toEqual(["/_portal/v1/blueprint", "/_portal/v1/snapshot?digest=abc"]);
  });

  it("fails naming the request it could not read, and never invents a snapshot", async () => {
    vi.stubGlobal("fetch", (path: string) => Promise.resolve(path.includes("blueprint") ? Response.json({ digest: "abc" }) : Response.json({}, { status: 409 })));
    expect(await Effect.runPromise(Effect.flip(load()))).toEqual({ _tag: "DataFailed", request: "/_portal/v1/snapshot?digest=abc", reason: "it answered 409" });
  });
});
