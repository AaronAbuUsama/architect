// `Model.journeys` and `Model.startingWorlds` (on m1), as Plugged In's journey files on `links/stage-1` declare them.
// The wire on m1 still marks them unavailable (packages/portal/src/modules/wire/service.ts:7).

export type JStep = { title: string; actor: string; op: string; payload: string; checks: string[]; ok: boolean };
export type Journey = { slug: string; name: string; file: string; starts: string | null; cast: Record<string, string>; verdicts: Record<string, "pass" | "fail" | "stale" | "unproven">; steps: JStep[] };

const s = (title: string, actor: string, op: string, payload: string, checks: string[], ok = true): JStep => ({ title, actor, op, payload, checks, ok });

export const journeys: Journey[] = [
  {
    slug: "a-name-is-claimed-once", name: "a name is claimed once", file: "journeys/a-name-is-claimed-once.ts", starts: "claimed-aaron",
    cast: { aaron: "signed-in", bob: "signed-in", visitor: "anyone" },
    verdicts: { local: "pass", test: "pass", staging: "pass", production: "unproven" },
    steps: [
      s("retrying the first request returns the same handle and does no work", "aaron", "handle.claim", '{ name: "aaron" } request first-claim', ["answer is the world's handle", "no events", "spans absent: load, record"]),
      s("a fresh request to claim the same name is refused", "aaron", "handle.claim", '{ name: "aaron" } request another-claim', ["refuses HandleTaken HN-001", "no events"]),
      s("another person cannot claim the name even with the same request key", "bob", "handle.claim", '{ name: "aaron" } request first-claim', ["refuses HandleTaken HN-001", "no events"]),
      s("aaron cannot claim another name while he owns this one", "aaron", "handle.claim", '{ name: "second" }', ["refuses HandleAlreadyOwned", "no events"]),
      s("anyone can resolve the name to the original handle", "visitor", "handle.resolve", '{ name: "aaron" }', ["answer is the world's handle"]),
      s("a stranger cannot release the handle", "bob", "handle.release", "{ handle: world.aaronHandle }", ["refuses NotAllowed", "no events"]),
      s("aaron releases his handle", "aaron", "handle.release", "{ handle: world.aaronHandle }", ["emits HandleReleased"]),
      s("the owner cannot release it twice", "aaron", "handle.release", "{ handle: world.aaronHandle }", ["refuses HandleNotClaimed (machine)", "no events"]),
      s("the released name no longer resolves", "visitor", "handle.resolve", '{ name: "aaron" }', ["refuses HandleNotFound"]),
      s("another person can claim the released name", "bob", "handle.claim", '{ name: "aaron" }', ["emits HandleClaimed"]),
    ],
  },
  {
    slug: "claim-a-public-page", name: "claim a public page", file: "journeys/claim-a-public-page.ts", starts: null,
    cast: { aaron: "signed-in", visitor: "anyone" },
    verdicts: { local: "pass", test: "pass", staging: "pass", production: "unproven" },
    steps: [
      s("an unclaimed name does not resolve", "visitor", "handle.resolve", '{ name: "firstpage" }', ["refuses HandleNotFound", "no events"]),
      s("an unclaimed name has no public page", "visitor", "profile.get", '{ handle: "firstpage" }', ["refuses ProfileNotFound", "no events"]),
      s("adding a link before claiming a name is refused", "aaron", "link.add", '{ title: "GitHub", url: "https://github.com/aaron" }', ["refuses LinkNeedsHandle", "no events"]),
      s("aaron claims his name", "aaron", "handle.claim", '{ name: "firstpage" } request first-claim', ["answer matches hdl_…", "emits HandleClaimed"]),
      s("an anonymous visitor can read the new page immediately", "visitor", "profile.get", '{ handle: "firstpage" }', ["answer { handle, links: [] }"]),
    ],
  },
  {
    slug: "edit-a-public-page", name: "edit a public page", file: "journeys/edit-a-public-page.ts", starts: "page-with-a-link",
    cast: { aaron: "signed-in", bob: "signed-in", visitor: "anyone" },
    verdicts: { local: "pass", test: "pass", staging: "fail", production: "unproven" },
    steps: [
      s("a visitor can read the first link and its public fields", "visitor", "profile.get", '{ handle: "linkpage" }', ["answer has the first link", "no events"]),
      s("aaron adds a second link", "aaron", "link.add", '{ title: "Website", url: "https://example.org" }', ["answer matches lnk_…", "emits LinkAdded"]),
      s("a stranger cannot move a link", "bob", "link.order", "{ link, position: 0 }", ["refuses NotAllowed", "no events"]),
      s("aaron moves the second link to the top", "aaron", "link.order", "{ link, position: 0 }", ["no events"]),
      s("the public page shows the new order", "visitor", "profile.get", '{ handle: "linkpage" }', ["links[0].title is Website"], false),
      s("aaron removes the first link he added", "aaron", "link.remove", "{ link: world.firstLink }", ["emits LinkRemoved"]),
      s("the owner cannot remove it twice", "aaron", "link.remove", "{ link: world.firstLink }", ["refuses LinkNotListed (machine)", "no events"]),
    ],
  },
];

export type World = { slug: string; file: string; from: string | null; cast: Record<string, string>; makes: string[]; gives: string[] };
export const worlds: World[] = [
  { slug: "claimed-aaron", file: "blueprint/starting-worlds/claimed-aaron.ts", from: null, cast: { aaron: "signed-in" },
    makes: ['aaron → handle.claim { name: "aaron" } request first-claim'], gives: ["aaronHandle"] },
  { slug: "page-with-a-link", file: "blueprint/starting-worlds/page-with-a-link.ts", from: null, cast: { aaron: "signed-in" },
    makes: ['aaron → handle.claim { name: "linkpage" }', 'aaron → link.add { title: "GitHub", url: "https://github.com/aaron" }'], gives: ["firstLink"] },
];
export const journeysCalling = (op: string) => journeys.filter((j) => j.steps.some((st) => st.op === op));
