import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CallsMeter, EnvironmentPill, Move } from "./service.ts";
import { meterNames } from "./types.ts";

it("exports exactly the declared names", () => {
  const service = readFileSync(new URL("./service.ts", import.meta.url), "utf8");
  const exported = [...service.matchAll(/export \{ (\w+) \} from/g)].map((m) => m[1]);
  expect(exported.toSorted()).toEqual([...meterNames].toSorted());
});

it("CallsMeter shows the total and each outcome's count, and only the segments that have calls", () => {
  const html = renderToStaticMarkup(createElement(CallsMeter, { split: { answered: 2, refused: 4, defects: 0 }, label: "handle" }));
  expect(html).toContain("handle: 6 calls, 2 answered, 4 refused, 0 defects");
  expect(html).not.toContain("calls-meter__seg tone-bg-danger");
});

it("EnvironmentPill marks a live one, and Move draws a creating move from `new`", () => {
  expect(renderToStaticMarkup(createElement(EnvironmentPill, { name: "local", live: true }))).toContain("is-live");
  expect(renderToStaticMarkup(createElement(Move, { from: [], to: ["claimed"] }))).toContain("new");
});
