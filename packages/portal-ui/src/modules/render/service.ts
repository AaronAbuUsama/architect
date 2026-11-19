import { renderToStaticMarkup } from "react-dom/server";
import type { RenderApi } from "./types.ts";

export const Render: RenderApi = {
  document: (page) => `<!doctype html>\n${renderToStaticMarkup(page)}\n`,
  fragment: (element) => renderToStaticMarkup(element),
};
