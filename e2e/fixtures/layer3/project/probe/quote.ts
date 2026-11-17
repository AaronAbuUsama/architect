import { Blueprint, Schema } from "@architect/blueprint";
import { Probe } from "../thing.ts";
import { quote } from "../../../dependencies/pricing.ts";
export default Blueprint.operation(Probe, {
  description: "Call the authored real HTTP dependency.",
  payload: { origin: Blueprint.text({ max: 200 }), mode: Blueprint.value(Schema.Literals(["ok", "reject", "throw", "hold"])) },
  answer: { value: Blueprint.text({ max: 100 }) },
  allowed: [Blueprint.anyone], uses: [quote],
});
