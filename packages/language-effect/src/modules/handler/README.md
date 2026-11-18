# handler

`Handlers.serve({ name, operation, handler })`, the wrapper every generated operation runs through. It decodes the
payload (refusing with `InvalidPayload` before the handler runs), opens the operation's span (named after it, with
`operation` and `principal.*`), checks who may call as that span's first child `<name>.access` (`step.kind: "access"`;
a `NotAllowed` refusal is written on the operation's span as `refusal`, like every refusal, and no handler work or step
span runs, and no payload is written, O3), runs the handler as counted work inside the operation's span with `payload.<field>` and `answer.<field>` attributes for the declared **public** fields only (an allowlist
from `visibility`, L2.P: a secret or private value is never an attribute, and neither is a field the declaration does not name; the
journal likewise drops a non-public event field), gives each declared step its own span `<name>.<key>`, and checks
the answer against its declaration (an answer outside it dies, as the handler's bug). The move is written on the
operation's span (`move.name`, `move.to`, then `event.name`) whichever span the handler calls `move` from, a step's
included; an outcome the move doesn't declare is written there before the handler dies. Machines and events join it in
stage one's later steps.

`Reads.serve` serves two kinds of read, each in its own span with the role check `<name>.access` under it, as for operations: by id (one instance, a missing one refused `NotAllowed`) and a list (`where`, `order`,
`page`; L2.04). A list reads a page from `Store.list`: instances matching every filter the caller gave, in the order the rows were
made (never a clock), `page` of them, answered `{ items, next }`; `next` is a cursor to send back as `cursor`, and null on the
last page. Its role is decided on the thing a filter names (`owner.of("organization")`), so a list with no such filter is refused.

How a span ends (O1, D3 #105): a declared refusal ends the operation's span, and a step's, **ok** with its `refusal` tag, since it is an outcome and
must not turn a trace red or count as an error; a defect ends it as an **error** with its `defect` tag. `internal/span.ts` (`spanned`) does it for
operations, steps and reads.
