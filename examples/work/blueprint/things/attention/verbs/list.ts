import { Blueprint } from "@architect/blueprint";
import { Attention } from "../thing.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.read(Attention, {
  where: ["mission", "state"],
  order: "newest",
  page: 50,
  allowed: [owner.of("mission")],
  budget: { p95: "80 millis" },
});
