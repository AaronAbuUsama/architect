# handler

`Handlers.serve({ name, operation, handler })`, the wrapper every generated operation runs through. It decodes the
payload (refusing with `InvalidPayload` before the handler runs), checks who may call (`NotAllowed`, before the
handler's span opens, so a refused caller leaves no handler span), runs the handler as counted work inside a span named
after the operation with `payload.<field>` and `answer.<field>` attributes for declared public fields, with public text
included only when marked `Blueprint.traced(...)` (O2). The journal keeps public event fields. The wrapper gives each
declared step its own span `<name>.<key>` and checks
the answer against its declaration (an answer outside it dies, as the handler's bug). Machines and events join it in
stage one's later steps.

`Reads.serve` serves two kinds of read: by id (one instance, a missing one refused `NotAllowed`) and a list (`where`, `order`,
`page`; L2.04). A list reads a page from `Store.list`: instances matching every filter the caller gave, in the order the rows were
made (never a clock), `page` of them, answered `{ items, next }`; `next` is a cursor to send back as `cursor`, and null on the
last page. Its role is decided on the thing a filter names (`owner.of("organization")`), so a list with no such filter is refused.

How a span ends (O1, D3 #105): a declared refusal ends the operation's span, and a step's, **ok** with its `refusal` tag, since it is an outcome and
must not turn a trace red or count as an error; a defect ends it as an **error** with its `defect` tag. `internal/span.ts` (`spanned`) does it for
operations, steps and reads.
