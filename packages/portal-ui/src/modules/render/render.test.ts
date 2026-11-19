import { createElement } from "react";
import { expect, it } from "vitest";
import { Render } from "./service.ts";

it("renders a document with its doctype, and the same element to the same bytes twice", () => {
  const page = createElement("html", { lang: "en" }, createElement("body", null, "x"));
  expect(Render.document(page)).toBe("<!doctype html>\n<html lang=\"en\"><head></head><body>x</body></html>\n");
  expect(Render.document(page)).toBe(Render.document(page));
  expect(Render.fragment(createElement("b", null, "y"))).toBe("<b>y</b>");
});
