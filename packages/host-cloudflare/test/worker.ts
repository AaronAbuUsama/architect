// The test Worker: exports the world so workerd can host it. Nothing else.
export { World } from "../src/modules/world/service.ts";
export default { fetch: () => new Response("test worker") };
