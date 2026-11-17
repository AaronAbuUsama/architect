# Spike: the portal as a real Fumadocs site, generated from the blueprint

**Question.** Can the portal be a static Fumadocs site whose every page comes from `generated/portal/blueprint.json`,
with HeroUI (open source) for the app-like parts, and live proof layered on top? It is the working form of
`spikes/portal-docs/` and the look for `design/briefs/F3-portal-upgrade.md`.

**Run it.**

```bash
cd spikes/portal-fumadocs && pnpm install && pnpm build && python3 -m http.server 8979 -d build/client
```

Then open http://localhost:8979/portal/. `pnpm dev` also works.

**How it is put together.**

- `app/blueprint/acme.json`: acme's real blueprint (`python3 data.py` rewrites it from origin/layer/3).
- `app/blueprint/paths.ts`, `source.ts`: Fumadocs' `loader()` over virtual pages, one per thing, operation, event, reference
  table and environment, at F2's URLs. The sidebar tree, breadcrumbs, table of contents and static search are Fumadocs'.
- `app/views/`: page bodies. Fumadocs' TypeTable, Tabs and Callout for docs content. HeroUI's Table, Dropdown, SearchField,
  Chip and Tooltip for `DataTable` (Filter, Columns, Search, sortable headers), which every list uses. Architect's own: the
  machine diagram, the proof table (a verdict and its nine evals as one table), the access matrix (operations × roles).
- `react-router.config.ts`: `ssr: false` with every page prerendered (43 files) under `/portal`; nothing renders per request.
- `app/app.css`: HeroUI's tokens are pointed at Fumadocs' variables so the two read as one site.

**What is real, what is not.** Everything from the blueprint is real. `app/blueprint/evidence.ts` is an illustration of
`/_portal/v1/snapshot` plus per-eval results (the logbook keeps one verdict per operation today). Everything it fills is
wrapped in `<Live>`; the sidebar's "Static file" switch blanks those slots, as the generator would write the page.

**Found.** Fumadocs 16.17.10 runs under React Router 8.5.1 prerendering with a virtual source and no MDX; HeroUI 3.2.7
components render inside its pages and share its palette by token mapping. Static search works from a prerendered index.

**Open.** The Worker's slot filling (HTMLRewriter) is not built here. Journeys wait on F2.2. Pins: all exact and at least two
weeks old (this spike is its own pnpm workspace with `minimumReleaseAge`). Throwaway: never imported by packages.
