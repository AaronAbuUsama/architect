import { Blueprint } from "@architect/blueprint";
import { Mission } from "../thing.ts";

export default Blueprint.read(Mission, {
  where: ["owner", "state"],
  order: "newest",
  page: 20,
  allowed: [Blueprint.signedIn],
  budget: { p95: "80 millis" },
});
