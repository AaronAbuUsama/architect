# wrong-password-signs-in

**Replaces:** `src/session/sign-in.ts` with `session/sign-in.ts` here.
**Breaks:** catches `AuthRefused` and answers a made-up session and token, so any password signs in.
**Must fail:** journey `sign up and sign in`, step "a wrong password is refused" (expected `SessionCredentialsWrong`, got a 200 with a `ses_` answer). The right-password step still passes.
**Failure shape:** `sign up and sign in ✘ "a wrong password is refused": expected SessionCredentialsWrong, the call answered`.

**Assumption for the builder (align the real interface to it):** a service `Auth` exported from `@architect/target-effect`, with
`signIn({ email, password }) => Effect<{ session: string; token: string }, AuthRefused>`, where `AuthRefused` is a tagged error
(`_tag: "AuthRefused"`) with `reason: "credentials" | "taken"`. The packages already ship this in `packages/target-effect/src/modules/auth/types.ts`.
The generated `Handler` type defaults `R` to `Records | SqlClient`, so an auth-backed handler needs `Handler<Records | SqlClient.SqlClient | Auth>`
(or the generator widening `R` for operations that use auth). The real handler maps `AuthRefused { reason: "credentials" }` to `SessionCredentialsWrong`.
