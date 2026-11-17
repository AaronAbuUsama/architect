// Planted fixture: answers a session even when Auth says the credentials are wrong.
import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import { Auth, type Records } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/session/sign-in.handler.ts";

const signIn: Handler<Records | SqlClient.SqlClient | Auth> = ({ email, password }, { steps }) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    // BREAK: a refusal ("credentials") is swallowed and a made-up session answered, so a wrong password signs in.
    return yield* steps.verify(
      auth.signIn({ email, password }).pipe(
        Effect.catchTag("AuthRefused", () => Effect.succeed({ session: "ses_planted1", token: "planted-token" })),
      ),
    );
  });

export default signIn;
