# sdk

The `sdk` projection: `generated/sdk/`, the typed client every other door is built on (K5 seam 5). One function per
operation, `Sdk.<thing>.<verb>(payload, { requestKey? })`, and the SDK contract:

- the caller is the client's layer, `Sdk.layer({ url, credential: Sdk.Credential.session(token) })` (the positional
  `Sdk.layer(url, token?)` the CLI uses stays), and never a call's;
- a call has a request key, the caller's or one made when it starts, sent as `idempotency-key`; a lost answer
  (`TransportError`) is retried with that key for an operation declared `idempotent: "request"`, and for no other;
- a declared refusal is a class in the error channel, a payload its schema refuses is `InvalidPayload` raised before
  anything is sent, and a server defect (a 5xx) is a die.

An operation that runs on the device is its plugin's handler, run in this process. Test: `sdk.test.ts` (acme's committed
`generated/sdk/`); the contract is judged by `e2e/m1/14-clients.test.ts`.
