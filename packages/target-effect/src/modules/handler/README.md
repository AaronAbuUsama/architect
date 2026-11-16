# handler

`Handlers.serve({ name, operation, handler })`, the wrapper every generated operation runs through. It decodes the
payload (refusing with `InvalidPayload` before the handler runs), checks who may call (`NotAllowed`, before the
handler's span opens, so a refused caller leaves no handler span), runs the handler as counted work inside a span named
after the operation with `payload.<field>` attributes, gives each declared step its own span `<name>.<key>`, and checks
the answer against its declaration (an answer outside it dies, as the handler's bug). Machines and events join it in
stage one's later steps.
