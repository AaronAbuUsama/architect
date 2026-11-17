// Independent caller journey. It invokes the actual authored HTTP fixture through the generated dependency service.
import { Blueprint, expect, noEvents, refuses, spans } from "@architect/blueprint";
import quote from "../blueprint/things/probe/verbs/quote.ts";
import { PriceUnavailable } from "../blueprint/things/allowance/errors.ts";
const origin = "http://127.0.0.1:19175";
export default Blueprint.journey("a raw Promise dependency succeeds and refuses through its selected project error", {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
    s.step("actual HTTP success", s.visitor.run(quote, { origin, mode: "ok" }), expect((answer) => answer.value).toBe("ok"), noEvents(), spans({ present: ["dependency:pricing.quote"] })),
    s.step("actual Promise rejection", s.visitor.run(quote, { origin, mode: "reject" }), refuses(PriceUnavailable), noEvents()),
    s.step("synchronous library invocation failure", s.visitor.run(quote, { origin, mode: "throw" }), refuses(PriceUnavailable), noEvents()),
  ],
});
