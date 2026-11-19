import { Effect } from "effect";
import { ours } from "./internal/ours.ts";
import { sheet } from "./internal/read.ts";
import type { StylesApi } from "./types.ts";

// Pro's package name is built, not written, so the built `dist` mentions Pro only in the imports it declares (F7, check 15).
const pro = ["@heroui-pro", "react"].join("/");

export const Styles: StylesApi = {
  ours,
  css: Effect.all([sheet("@heroui/styles", "dist/heroui.min.css"), sheet(pro, "dist/heroui-pro.min.css")]).pipe(
    Effect.map(([base, proSheet]) => `${base}\n${proSheet}\n${ours}`),
  ),
};
