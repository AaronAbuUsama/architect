import { Effect } from "effect";
import type { Route } from "../types.ts";

/** A name in a path: declared names are lowercase words with dots and dashes, so anything else cannot name one. */
const NAME = /^[a-z0-9][a-z0-9.-]*$/;

const nameIn = (segment: string): string | undefined => {
  const decoded = Effect.runSync(Effect.try({ try: () => decodeURIComponent(segment), catch: () => "" }).pipe(Effect.catch(() => Effect.succeed(""))));
  return NAME.test(decoded) ? decoded : undefined;
};

/** `/portal` and `/portal/` are home; `/portal/things/<name>` and `/portal/operations/<name>` are pages if the name is a name. */
export const routeOf = (pathname: string): Route => {
  const parts = pathname.replace(/\/+$/, "").split("/").slice(1);
  if (parts[0] !== "portal") return { page: "missing" };
  if (parts.length === 1) return { page: "home" };
  const name = parts.length === 3 ? nameIn(parts[2]!) : undefined;
  if (name === undefined) return { page: "missing" };
  if (parts[1] === "things") return { page: "thing", name };
  if (parts[1] === "operations") return { page: "operation", name };
  return { page: "missing" };
};
