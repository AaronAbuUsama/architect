import type { NavItem } from "../types.ts";

// The fixed part of F2's navigation. Things and environments come from the blueprint once the face reads /_portal/v1.
export const NAV: ReadonlyArray<NavItem> = [
  { key: "overview", label: "Overview", href: "/", section: "start" },
  { key: "operations", label: "Operations & reads", href: "/operations", section: "reference" },
  { key: "events", label: "Events", href: "/events", section: "reference" },
  { key: "errors", label: "Errors & refusals", href: "/errors", section: "reference" },
  { key: "roles", label: "Roles", href: "/roles", section: "reference" },
  { key: "values", label: "Values", href: "/values", section: "reference" },
  { key: "journeys", label: "Journeys", href: "/journeys", section: "proof" },
  { key: "worlds", label: "Starting worlds", href: "/worlds", section: "proof" },
  { key: "releases", label: "Releases", href: "/releases", section: "proof" },
  { key: "board", label: "Board", href: "/work", section: "work" },
  { key: "docs", label: "Docs", href: "/docs", section: "read" },
];

/** The entries grouped by section, in navigation order, each section once. */
export const sections = (items: ReadonlyArray<NavItem>): ReadonlyArray<readonly [NavItem["section"], ReadonlyArray<NavItem>]> => {
  const order: ReadonlyArray<NavItem["section"]> = ["start", "things", "reference", "proof", "work", "read"];
  return order.map((s) => [s, items.filter((i) => i.section === s)] as const).filter(([, list]) => list.length > 0);
};
