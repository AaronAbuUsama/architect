import { Blueprint } from "@architect/blueprint";
import { Run } from "../thing.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.read(Run, {
  where: ["mission", "task", "state"],
  order: "newest",
  page: 50,
  allowed: [owner.of("mission")],
  budget: { p95: "80 millis" },
});
