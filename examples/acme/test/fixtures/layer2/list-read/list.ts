// Planted fixture: the docs' `allowance.list`, as the user writes it after `architect add read allowance.list`.
// Install over blueprint/things/allowance/verbs/list.ts.
import { Blueprint } from "@architect/blueprint";
import { Allowance } from "../thing.ts";
import { owner } from "../../organization/roles.ts";

// A read across allowances: the owner lists the organisation's, newest first, fifty to a page.
export default Blueprint.read(Allowance, {
  where: ["organization", "member", "state"],
  order: "newest",
  page: 50,
  allowed: [owner.of("organization")],
  budget: { p95: "100 millis" },
});
