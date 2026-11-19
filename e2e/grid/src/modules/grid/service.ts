import { parseList, switchOn } from "./internal/list.ts";
import { lines, run } from "./internal/run.ts";
import type { GridApi } from "./types.ts";

export const Grid: GridApi = { parse: parseList, run, lines, switchOn };
