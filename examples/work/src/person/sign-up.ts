// Scaffolded from blueprint/things/person/verbs/sign-up.ts. Yours from now on.
import { Effect } from "effect";
import { Auth } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/person/sign-up.handler.ts";
import { PersonEmailTaken } from "../../blueprint/things/person/errors.ts";

/** Sign up with an email address and a password. Better Auth keeps the person and the password's hash. */
const signUp: Handler = ({ email, password, name }, { steps }) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const made = yield* steps.create(auth.signUp({ email, password, name })).pipe(
      Effect.catchTag("AuthRefused", () =>
        Effect.gen(function* () {
          yield* Effect.logInfo("someone has already signed up with this email");
          return yield* new PersonEmailTaken({});
        }),
      ),
    );
    return { person: made.person as never };
  });

export default signUp;
