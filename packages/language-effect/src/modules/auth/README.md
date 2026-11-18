# auth

The `Auth` service: sign up, sign in, API keys. Handlers that deal in identity (the starter's `person.sign-up`,
`session.sign-in`, `api-key.create`) use it; the host provides it. On Cloudflare that is Better Auth on D1
(`@orthograph/host-cloudflare`, module `auth`), which also turns a bearer token or an API key into the principal.
Refusals come back as `AuthRefused` with a reason, which a handler maps to its own declared error after logging why.
`authMemory` is the same contract over a map, for the runtime's own tests.
