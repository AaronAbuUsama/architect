import { Blueprint } from "orthograph";
import { Milestone } from "../thing.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.read(Milestone, {
  where: ["mission", "state"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("mission")],
  budget: { p95: "80 millis" },
});
