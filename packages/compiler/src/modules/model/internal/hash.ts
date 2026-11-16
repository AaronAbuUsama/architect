import { createHash } from "node:crypto";

/** JSON with keys sorted at every level, so the same declaration always gives the same text. */
export const canonical = (x: unknown): string =>
  JSON.stringify(x, (_, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );

/** A declaration's hash: from what it means, never from how its file is formatted. */
export const hashOf = (entry: unknown): string => createHash("sha256").update(canonical(entry)).digest("hex").slice(0, 16);
