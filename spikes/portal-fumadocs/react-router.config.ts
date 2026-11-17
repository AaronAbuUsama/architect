import type { Config } from "@react-router/dev/config";
import { paths } from "./app/blueprint/paths.ts";

// Static: every page is prerendered to a file at build time; nothing renders per request (D3 #130 serves them at /portal).
export default { ssr: false, basename: "/portal/", prerender: () => ["/", "/api/search", ...paths()] } satisfies Config;
