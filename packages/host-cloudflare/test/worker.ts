// The test Worker: exports the world and the entity so workerd can host them. Nothing else.
export { World } from "../src/modules/world/service.ts";
export { Entity } from "../src/modules/entities/service.ts";
export default { fetch: () => new Response("test worker") };
