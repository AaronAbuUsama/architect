import { Blueprint } from "@architect/blueprint";
import { Mission } from "../thing.ts";

// Open (F5 §4): a list read cannot yet be held to the caller's own rows, so any signed-in person could list every owner's
// missions. Fine for one person and their agents; it must be scoped before work serves more than one owner.
export default Blueprint.read(Mission, {
  where: ["owner", "state"],
  order: "newest",
  page: 20,
  allowed: [Blueprint.signedIn],
  budget: { p95: "80 millis" },
});
