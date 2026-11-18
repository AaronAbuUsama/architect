import { Blueprint } from "orthograph";
import { Question } from "../thing.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.read(Question, {
  where: ["mission", "state"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("mission")],
  budget: { p95: "80 millis" },
});
