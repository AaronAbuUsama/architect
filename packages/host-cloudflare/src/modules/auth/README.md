# auth

Better Auth 1.7.15 on D1 (spike `spikes/better-auth-workerd/`), for identity only: people (`per_`), sessions (`ses_`),
accounts and API keys (`key_` ids, keys starting `ak_`). Every table is `auth_*`, created on first use from
`internal/schema.ts`, which `scripts/auth-schema.ts` writes from `internal/options.ts` (the test fails if it's stale).
`AuthD1.layer` gives `Principals` (a bearer session token or an API key becomes the person, with their email; anything
else is anonymous) and the runtime's `Auth` service for handlers. `AuthD1.castMember` is how a local world signs its
cast up for real. Organizations, memberships and invitations are the project's own things, not Better Auth's.
