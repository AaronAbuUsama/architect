import { Effect } from "effect";
import { ours } from "./internal/ours.ts";
import { sheet } from "./internal/read.ts";
import type { StylesApi } from "./types.ts";

export const Styles: StylesApi = {
  ours,
  css: Effect.all([sheet("@heroui/styles", "dist/heroui.min.css"), sheet("@heroui-pro/react", "dist/heroui-pro.min.css")]).pipe(
    Effect.map(([base, pro]) => `${base}\n${pro}\n${ours}`),
  ),
};
