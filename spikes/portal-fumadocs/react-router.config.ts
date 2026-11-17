import type { Config } from "@react-router/dev/config";
import { paths } from "./app/blueprint/paths.ts";
import { missions, runs, tasks, workers } from "./app/work/fixtures.ts";

const work = ["/work", "/work/agents", ...workers.map((w) => `/work/agents/${w.id}`), ...missions.flatMap((m) => [`/work/m/${m.id}`, `/work/m/${m.id}/board`]), ...tasks.map((t) => `/work/t/${t.id}`), ...runs.map((r) => `/work/r/${r.id}`)];
// Static: every page is prerendered to a file at build time; nothing renders per request (D3 #130 serves them at /portal).
export default { ssr: false, basename: "/portal/", prerender: () => ["/", "/api/search", ...paths(), ...work] } satisfies Config;
