// Journey-author file. The builder of person.sign-up and session.sign-in never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { PersonEmailTaken } from "../blueprint/things/person/errors.ts";
import { SessionCredentialsWrong } from "../blueprint/things/session/errors.ts";
import signUp from "../blueprint/things/person/verbs/sign-up.ts";
import signIn from "../blueprint/things/session/verbs/sign-in.ts";
import show from "../blueprint/things/session/verbs/show.ts";

export default Blueprint.journey("sign up and sign in", {
  // The newcomer is not signed up by the world: they get a fresh email and password and no token.
  cast: { newcomer: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "before signing up the newcomer is nobody",
      s.newcomer.run(show, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["session.show"] }),
    ),
    s.step(
      "the newcomer signs up",
      s.newcomer.run(signUp, { email: s.newcomer.email, password: s.newcomer.password, name: "Newcomer" }),
      expect((a) => a.person).toMatch(/^per_[0-9a-z]+$/),
      spans({ present: ["person.sign-up", "person.sign-up.create"] }),
    ),
    s.step(
      "signing up again with the same email is refused",
      s.newcomer.run(signUp, { email: s.newcomer.email, password: s.newcomer.password, name: "Newcomer again" }),
      refuses(PersonEmailTaken),
      noEvents(),
      spans({ present: ["person.sign-up"] }),
    ),
    s.step(
      "a wrong password is refused",
      s.newcomer.run(signIn, { email: s.newcomer.email, password: "not-the-password" }),
      refuses(SessionCredentialsWrong),
      noEvents(),
      spans({ present: ["session.sign-in"] }),
    ),
    s.step(
      "the right password answers a session and a token",
      s.newcomer.run(signIn, { email: s.newcomer.email, password: s.newcomer.password }),
      expect((a) => a.session).toMatch(/^ses_[0-9a-z]+$/),
      expect((a) => a.token).toMatch(/^.+$/),
      spans({ present: ["session.sign-in", "session.sign-in.verify"] }),
    ),
  ],
});
