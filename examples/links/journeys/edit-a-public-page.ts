// Journey-author file. The builder never edits it.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { LinkAlreadyRemoved } from "../blueprint/things/link/errors.ts";
import { LinkAdded, LinkRemoved } from "../blueprint/things/link/events.ts";
import { machine } from "../blueprint/things/link/machine.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import order from "../blueprint/things/link/verbs/order.ts";
import remove from "../blueprint/things/link/verbs/remove.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

export default Blueprint.journey("edit a public page", {
  cast: { aaron: Blueprint.signedIn, bob: Blueprint.signedIn, visitor: Blueprint.anyone },
  starts: "page-with-a-link",
  steps: (s) => [
    s.step(
      "a visitor can read the first link and its public fields",
      s.visitor.run(get, { handle: "linkpage" }),
      expect((a) => a).toEqual({
        handle: "linkpage",
        links: [{ id: s.world.firstLink, title: "GitHub", url: "https://github.com/aaron" }],
      }),
      noEvents(),
    ),
    s.step(
      "aaron adds a second link",
      s.aaron.run(add, { title: "Website", url: "https://example.org" }),
      expect((a) => a.link).toMatch(/^lnk_[0-9a-z]+$/),
      emits(LinkAdded, { link: s.last.link }),
      machine.isIn(s.last.link, "listed"),
    ),
    s.step(
      "new links appear at the end",
      s.visitor.run(get, { handle: "linkpage" }),
      expect((a) => a.links[0].id).toBe(s.world.firstLink),
      expect((a) => a.links[1].title).toBe("Website"),
    ),
    s.step(
      "a stranger cannot move a link",
      s.bob.run(order, { link: s.last.links[1].id, position: 0n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["link.order"] }),
    ),
    s.step(
      "a stranger cannot remove a link",
      s.bob.run(remove, { link: s.world.firstLink }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["link.remove"] }),
    ),
    s.step(
      "aaron moves the second link to the top",
      s.aaron.run(order, { link: s.last.links[1].id, position: 0n }),
      noEvents(),
    ),
    s.step(
      "the public page shows the new order",
      s.visitor.run(get, { handle: "linkpage" }),
      expect((a) => a.links[0].title).toBe("Website"),
      expect((a) => a.links[1].id).toBe(s.world.firstLink),
    ),
    s.step(
      "aaron removes the first link he added",
      s.aaron.run(remove, { link: s.world.firstLink }),
      emits(LinkRemoved, { link: s.world.firstLink }),
      machine.isIn(s.world.firstLink, "removed"),
    ),
    s.step(
      "the owner cannot remove it twice",
      s.aaron.run(remove, { link: s.world.firstLink }),
      refuses(machine.notFrom, { state: "removed" }),
      noEvents(),
      spans({ absent: ["link.remove.record"] }),
    ),
    s.step(
      "the owner cannot reorder the removed link",
      s.aaron.run(order, { link: s.world.firstLink, position: 0n }),
      refuses(LinkAlreadyRemoved),
      noEvents(),
      spans({ absent: ["link.order.record"] }),
    ),
    s.step(
      "the public page only lists the remaining link",
      s.visitor.run(get, { handle: "linkpage" }),
      expect((a) => a.links.length).toBe(1),
      expect((a) => [a.links[0].title, a.links[0].url]).toEqual(["Website", "https://example.org"]),
      noEvents(),
    ),
  ],
});
