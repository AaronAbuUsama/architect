// Journey-author file. The builder never edits it.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { HandleAlreadyOwned, HandleNotFound, HandleTaken } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed, HandleReleased } from "../blueprint/things/handle/events.ts";
import { machine } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import release from "../blueprint/things/handle/verbs/release.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import { ProfileNotFound } from "../blueprint/things/profile/errors.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

export default Blueprint.journey("a name is claimed once", {
  cast: { aaron: Blueprint.signedIn, bob: Blueprint.signedIn, visitor: Blueprint.anyone },
  starts: "claimed-aaron",
  steps: (s) => [
    s.step(
      "retrying the first request returns the same handle and does no work",
      s.aaron.run(claim, { name: "aaron" }, { request: "first-claim" }),
      expect((a) => a.handle).toBe(s.world.aaronHandle),
      noEvents(),
      spans({ absent: ["handle.claim.load", "handle.claim.record"] }),
    ),
    s.step(
      "a fresh request to claim the same name is refused",
      s.aaron.run(claim, { name: "aaron" }, { request: "another-claim" }),
      refuses(HandleTaken, { code: "HN-001" }),
      noEvents(),
      spans({ absent: ["handle.claim.record"] }),
    ),
    s.step(
      "another person cannot claim the name even with the same request key",
      s.bob.run(claim, { name: "aaron" }, { request: "first-claim" }),
      refuses(HandleTaken, { code: "HN-001" }),
      noEvents(),
    ),
    s.step(
      "aaron cannot claim another name while he owns this one",
      s.aaron.run(claim, { name: "second" }),
      refuses(HandleAlreadyOwned),
      noEvents(),
    ),
    s.step(
      "anyone can resolve the name to the original handle",
      s.visitor.run(resolve, { name: "aaron" }),
      expect((a) => a.handle).toBe(s.world.aaronHandle),
      noEvents(),
    ),
    s.step(
      "a stranger cannot release the handle",
      s.bob.run(release, { handle: s.world.aaronHandle }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["handle.release"] }),
    ),
    s.step(
      "aaron puts a link on his page before releasing the name",
      s.aaron.run(add, { title: "Original owner's site", url: "https://example.org" }),
      expect((a) => a.link).toMatch(/^lnk_[0-9a-z]+$/),
    ),
    s.step(
      "aaron releases his handle",
      s.aaron.run(release, { handle: s.world.aaronHandle }),
      emits(HandleReleased, { handle: s.world.aaronHandle, name: "aaron" }),
      machine.isIn(s.world.aaronHandle, "released"),
    ),
    s.step(
      "the owner cannot release it twice",
      s.aaron.run(release, { handle: s.world.aaronHandle }),
      refuses(machine.notFrom, { state: "released" }),
      noEvents(),
      spans({ absent: ["handle.release.record"] }),
    ),
    s.step(
      "the released name no longer resolves",
      s.visitor.run(resolve, { name: "aaron" }),
      refuses(HandleNotFound),
      noEvents(),
    ),
    s.step(
      "the released name has no public page",
      s.visitor.run(get, { handle: "aaron" }),
      refuses(ProfileNotFound),
      noEvents(),
    ),
    s.step(
      "another person can claim the released name",
      s.bob.run(claim, { name: "aaron" }),
      emits(HandleClaimed, { handle: s.last.handle, name: "aaron" }),
      machine.isIn(s.last.handle, "claimed"),
    ),
    s.step(
      "the old owner cannot release the new owner's name",
      s.aaron.run(release, { handle: s.last.handle }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "the new owner's public page contains none of the old owner's links",
      s.visitor.run(get, { handle: "aaron" }),
      expect((a) => a).toEqual({ handle: "aaron", links: [] }),
      noEvents(),
    ),
  ],
});
