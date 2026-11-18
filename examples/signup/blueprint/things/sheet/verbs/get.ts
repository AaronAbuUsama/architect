import { Blueprint } from "orthograph";
import { Sheet } from "../thing.ts";

// A read. It changes nothing, so it has no move and no handler: it answers from the sheet's record.
export default Blueprint.read(Sheet, {
  by: "id",
  fields: ["title", "places", "taken", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
