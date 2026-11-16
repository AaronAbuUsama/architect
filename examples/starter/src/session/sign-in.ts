// Scaffolded from blueprint/things/session/verbs/sign-in.ts. Yours from now on.
import { Effect } from "effect";
import { Auth } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/session/sign-in.handler.ts";
import { SessionCredentialsWrong } from "../../blueprint/things/session/errors.ts";

/** Sign in with email and password; the token is the bearer for later calls. */
const signIn: Handler = ({ email, password }, { steps }) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const signed = yield* steps.verify(auth.signIn({ email, password })).pipe(
      Effect.catchTag("AuthRefused", () =>
        Effect.gen(function* () {
          yield* Effect.logInfo("the email and password don't match anyone");
          return yield* new SessionCredentialsWrong({});
        }),
      ),
    );
    return { session: signed.session as never, token: signed.token };
  });

export default signIn;
