import { createHash } from "node:crypto";

/** JSON with keys sorted at every level, so the same content always gives the same text (the compiler's rule for its hashes). */
export const canonical = (x: unknown): string =>
  JSON.stringify(x, (_, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );

export const digestOf = (unsigned: unknown): string => createHash("sha256").update(canonical(unsigned)).digest("hex");
