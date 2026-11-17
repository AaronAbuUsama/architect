import { index, route, type RouteConfig } from "@react-router/dev/routes";

// The docs pages come from the blueprint (one catch-all); Work is its own small app of managers, threads and tasks.
export default [
  index("routes/page.tsx", { id: "home" }),
  route("api/search", "routes/search.ts"),
  route("work", "work/manager.tsx", { id: "work-home" }),
  route("work/m/:mission", "work/manager.tsx"),
  route("work/m/:mission/board", "work/board.tsx"),
  route("work/t/:task", "work/task.tsx"),
  route("work/r/:run", "work/thread.tsx"),
  route("work/workers", "work/workers.tsx"),
  route("*", "routes/page.tsx"),
] satisfies RouteConfig;
