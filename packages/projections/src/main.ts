// @orthograph/projections: the projections Orthograph ships, each one a plugin an app mounts in `blueprint/projections/`
// (`export default Blueprint.use(server, (p) => [])`). Part one of M1.11 to M1.13: `model`, `api` and `server`; the SDK,
// the CLI, MCP, the docs and the portal follow, and arrive here too (M1-plugins section 15, X-10).
export { model } from "#modules/model/service.js";
export { api } from "#modules/api/service.js";
export { server } from "#modules/server/service.js";
