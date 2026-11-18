// A stand-in for the work plugin's server: the board's state and the rules a move must pass. Pure, so the rules are
// tested without a browser (board.test.ts) and the UI only ever asks "may I?" and "do it".

export const columns = ["backlog", "ready", "running", "review", "done"] as const;
export type Column = (typeof columns)[number];

export type Actor = { kind: "person" | "agent"; name: string };

export type Item = {
  id: string;
  title: string;
  column: Column;
  lane: "person" | "agent";
  touches: ReadonlyArray<string>; // files the item will write; two running items may not share one
  lease?: { holder: string; until: number };
  needs: ReadonlyArray<string>; // ids that must be done first
};

export type Board = { items: ReadonlyArray<Item>; limits: Partial<Record<Column, number>> };

export type Refusal =
  | { code: "MoveNotAllowed"; from: Column; to: Column }
  | { code: "OnlyAFactCloses" }
  | { code: "ItemLeased"; holder: string }
  | { code: "ColumnFull"; column: Column; limit: number }
  | { code: "FilesBusy"; files: ReadonlyArray<string>; by: string }
  | { code: "NeedsOpen"; open: ReadonlyArray<string> };

// The item's machine, as the plugin would declare it: which column may follow which.
const moves: Record<Column, ReadonlyArray<Column>> = {
  backlog: ["ready"],
  ready: ["backlog", "running"],
  running: ["ready", "review"],
  review: ["running", "done"],
  done: [],
};

/** The cheap check the drag uses on hover: the machine alone, no data. */
export const legal = (from: Column, to: Column): boolean => from === to || moves[from].includes(to);

/** The full check the server runs on drop. Returns the refusal, or nothing when the move may happen. */
export const refuse = (board: Board, id: string, to: Column, by: Actor, now: number): Refusal | undefined => {
  const item = board.items.find((i) => i.id === id);
  if (!item) return { code: "MoveNotAllowed", from: to, to };
  if (item.column === to) return undefined;
  if (to === "done") return { code: "OnlyAFactCloses" };
  if (!legal(item.column, to)) return { code: "MoveNotAllowed", from: item.column, to };
  if (item.lease && item.lease.holder !== by.name && item.lease.until > now)
    return { code: "ItemLeased", holder: item.lease.holder };
  if (to === "running") {
    const open = item.needs.filter((n) => board.items.find((i) => i.id === n)?.column !== "done");
    if (open.length > 0) return { code: "NeedsOpen", open };
    const running = board.items.filter((i) => i.column === "running" && i.id !== id);
    const limit = board.limits.running;
    if (limit !== undefined && running.length >= limit) return { code: "ColumnFull", column: "running", limit };
    for (const other of running) {
      const shared = other.touches.filter((f) => item.touches.includes(f));
      if (shared.length > 0) return { code: "FilesBusy", files: shared, by: other.id };
    }
  }
  return undefined;
};

/** Apply a move the rules allowed. Moving into running takes a lease; moving out of it lets the lease go. */
export const apply = (board: Board, id: string, to: Column, by: Actor, now: number): Board => ({
  ...board,
  items: board.items.map((i) =>
    i.id !== id ? i
    : to === "running" ? { ...i, column: to, lease: { holder: by.name, until: now + 10 * 60_000 } }
    : { ...i, column: to, lease: undefined }),
});

/** Place `id` before or after `target` within the list order (the board keeps one order for every column). */
export const reorder = (board: Board, ids: ReadonlyArray<string>, target: string, where: "before" | "after"): Board => {
  const moving = board.items.filter((i) => ids.includes(i.id));
  const rest = board.items.filter((i) => !ids.includes(i.id));
  const at = rest.findIndex((i) => i.id === target) + (where === "after" ? 1 : 0);
  return { ...board, items: [...rest.slice(0, at), ...moving, ...rest.slice(at)] };
};

const files = ["src/link/create.ts", "src/link/visit.ts", "src/board.ts", "blueprint/things/link/thing.ts", "docs/links.mdx"];
const verbs = ["create", "visit", "rename", "archive", "list", "share", "expire", "count"];

/** Fake work: deterministic, so two runs render the same board. */
export const seed = (count: number, perColumn?: Partial<Record<Column, number>>): Board => {
  const items: Item[] = [];
  for (let n = 0; n < count; n++) {
    const column = perColumn
      ? (columns.find((c, i) => n < columns.slice(0, i + 1).reduce((s, k) => s + (perColumn[k] ?? 0), 0)) ?? "backlog")
      : columns[n % columns.length]!;
    items.push({
      id: `w${n + 1}`,
      title: `${["Build", "Prove", "Write journeys for", "Fix", "Improve"][n % 5]} link.${verbs[n % verbs.length]}`,
      column,
      lane: n % 3 === 0 ? "person" : "agent",
      touches: [files[n % files.length]!],
      needs: n > 4 && n % 7 === 0 ? [`w${n - 4}`] : [],
      ...(column === "running" ? { lease: { holder: n % 3 === 0 ? "ada" : `builder-${n}`, until: Number.MAX_SAFE_INTEGER } } : {}),
    });
  }
  return { items, limits: { running: 4 } };
};
