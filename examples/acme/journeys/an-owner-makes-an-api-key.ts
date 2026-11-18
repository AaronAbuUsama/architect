// Journey-author file. The builder of api-key.create and organization.create never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { machine } from "../blueprint/things/organization/machine.ts";
import { OrganizationCreated } from "../blueprint/things/organization/events.ts";
import create from "../blueprint/things/organization/verbs/create.ts";
import getOrganization from "../blueprint/things/organization/verbs/get.ts";
import createKey from "../blueprint/things/api-key/verbs/create.ts";

// `s.last` in a payload is the answer of the latest call that succeeded; a refused call leaves it alone.
export default Blueprint.journey("an owner makes an api key", {
  // ada owns the founded organisation; bob is signed in and owns nothing there.
  cast: { ada: owner, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step(
      "bob can't make a key in ada's organisation",
      s.bob.run(createKey, { organization: s.world.organization, name: "bob's key" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["api-key.create", "api-key.create.issue", "api-key.create.insert"] }),
    ),
    s.step(
      "ada makes a key; the secret is shown once",
      s.ada.run(createKey, { organization: s.world.organization, name: "ci" }),
      expect((a) => a.apiKey).toMatch(/^key_[0-9a-z]+$/),
      expect((a) => a.key).toMatch(/^.+$/),
      spans({ present: ["api-key.create", "api-key.create.issue", "api-key.create.insert"] }),
    ),
    s.step(
      "bob founds an organisation of his own",
      s.bob.run(create, { name: "Bob Co", cap: 1000n }),
      expect((a) => a.organization).toMatch(/^org_[0-9a-z]+$/),
      emits(OrganizationCreated, { organization: s.last.organization, owner: s.bob.person }),
      machine.isIn(s.last.organization, "active"),
      spans({ present: ["organization.create", "organization.create.insert", "organization.create.owner"] }),
    ),
    s.step(
      "ada can't read bob's organisation",
      s.ada.run(getOrganization, { id: s.last.organization }),
      refuses(Blueprint.NotAllowed),
    ),
    s.step(
      "bob makes a key in his own organisation",
      s.bob.run(createKey, { organization: s.last.organization, name: "bob's own key" }),
      expect((a) => a.apiKey).toMatch(/^key_[0-9a-z]+$/),
      expect((a) => a.key).toMatch(/^.+$/),
    ),
  ],
});
