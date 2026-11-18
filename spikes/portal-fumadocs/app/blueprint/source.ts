// The Fumadocs source: virtual pages made from the blueprint, so the sidebar tree, breadcrumbs and search come from Fumadocs
// while every page's content comes from the model. No MDX, no hand-written page.
import { loader, type StaticSource } from "fumadocs-core/source";
import { M, things, errors, events, roles } from "./model.ts";
import { pages, type PageKind } from "./paths.ts";

type PageData = { title: string; description: string; page: PageKind; structuredData: { headings: never[]; contents: Array<{ heading: undefined; content: string }> } };
type MetaData = { title?: string; pages?: string[]; defaultOpen?: boolean };

/** What search indexes for a page: its title, description and the names and codes it shows. */
const searchText = (p: PageKind): string[] => {
  if (p.kind === "operation") { const o = M.operations[p.operation]!; return [o.description, ...o.refusals.map((r) => `${r} ${errors[r]?.code}`), ...Object.keys(o.payload)]; }
  if (p.kind === "thing") return [M.things[p.thing]!.code, ...Object.keys(M.things[p.thing]!.fields)];
  if (p.kind === "error") { const e = errors[p.error]!; return [e.code, ...Object.values(e.when)]; }
  if (p.kind === "reference" && p.table === "errors") return Object.values(errors).map((e) => `${e.name} ${e.code}`);
  if (p.kind === "reference" && p.table === "events") return events.map((e) => e.name);
  return [];
};

const files = [
  ...pages().map((p) => ({
    type: "page" as const, path: p.path, slugs: p.slugs,
    data: { title: p.title, description: p.description, page: p.page, structuredData: { headings: [], contents: searchText(p.page).map((content) => ({ heading: undefined, content })) } } satisfies PageData,
  })),
  { type: "meta" as const, path: "meta.json", data: { pages: ["index", "proof", "---Things---", ...things.map((t) => `things/${t.name}`), "---Reference---", "...reference", "---Environments---", "...environments", "---Stories---", "journeys"] } },
  { type: "meta" as const, path: "proof/meta.json", data: { title: "Proof", pages: ["attention"] } },
  { type: "meta" as const, path: "reference/meta.json", data: { title: "Reference", pages: ["machines", "events", "errors", "values", "roles"] } },
  { type: "meta" as const, path: "reference/errors/meta.json", data: { title: "Errors", pages: Object.keys(errors).sort() } },
  { type: "meta" as const, path: "reference/roles/meta.json", data: { title: "Roles", pages: roles } },
  { type: "meta" as const, path: "reference/values/meta.json", data: { title: "Values", pages: Object.keys(M.values) } },
  { type: "meta" as const, path: "environments/meta.json", data: { title: "Environments", pages: ["test", "staging", "production", "local"] } },
  ...things.map((t) => ({ type: "meta" as const, path: `things/${t.name}/meta.json`, data: {
    title: t.name, pages: [
      "---Operations---", ...Object.values(M.operations).filter((o) => o.thing === t.name).map((o) => o.verb),
      ...(t.machine ? ["---State machine---", "machine"] : []),
      ...(Object.keys(t.events ?? {}).length ? ["---Events---", ...Object.keys(t.events ?? {})] : []),
    ] } satisfies MetaData })),
];

export const source = loader({ baseUrl: "/", source: { files } as StaticSource<{ pageData: PageData; metaData: MetaData }> });
export type SitePage = NonNullable<ReturnType<typeof source.getPage>>;
