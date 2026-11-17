import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [index("routes/page.tsx", { id: "home" }), route("api/search", "routes/search.ts"), route("*", "routes/page.tsx")] satisfies RouteConfig;
