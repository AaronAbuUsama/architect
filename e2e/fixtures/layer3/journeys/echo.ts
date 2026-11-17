// Independently authored operation journey; the implementation builder never edits it.
import { Blueprint, expect, noEvents, spans } from "@architect/blueprint";
import { echo } from "@fixture/echo/blueprint";

export default Blueprint.journey("a finished kit repeats with its configured prefix", {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [s.step("repeat through the kit", s.visitor.run(echo.repeat, { text: "hello" }),
    expect((answer) => answer.text).toBe("fixture: hello"), noEvents(), spans({ present: ["kit:fixture:echo.repeat"] }))],
});
