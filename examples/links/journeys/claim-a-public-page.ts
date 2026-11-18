// Journey-author file. The builder never edits it.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { HandleNotFound } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed } from "../blueprint/things/handle/events.ts";
import { machine } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import { LinkNeedsHandle } from "../blueprint/things/link/errors.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import { ProfileNotFound } from "../blueprint/things/profile/errors.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

export default Blueprint.journey("claim a public page", {
  cast: { aaron: Blueprint.signedIn, visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "an unclaimed name does not resolve",
      s.visitor.run(resolve, { name: "firstpage" }),
      refuses(HandleNotFound),
      noEvents(),
    ),
    s.step(
      "an unclaimed name has no public page",
      s.visitor.run(get, { handle: "firstpage" }),
      refuses(ProfileNotFound),
      noEvents(),
    ),
    s.step(
      "adding a link before claiming a name is refused",
      s.aaron.run(add, { title: "GitHub", url: "https://github.com/aaron" }),
      refuses(LinkNeedsHandle),
      noEvents(),
      spans({ absent: ["link.add.record"] }),
    ),
    s.step(
      "aaron claims his name",
      s.aaron.run(claim, { name: "firstpage" }, { request: "first-claim" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      emits(HandleClaimed, { handle: s.last.handle, name: "firstpage" }),
      machine.isIn(s.last.handle, "claimed"),
      spans({ present: ["handle.claim.load", "handle.claim.record"] }),
    ),
    s.step(
      "an anonymous visitor can read the new page immediately",
      s.visitor.run(get, { handle: "firstpage" }),
      expect((a) => a).toEqual({ handle: "firstpage", links: [] }),
      noEvents(),
    ),
  ],
});
