# Client

Owns the Effect adapter over the pinned SDK. One operation has request, sync,
prove, submit and wait children. Refusals retain their typed payload only on the
device. The entry file installs a tracer that strips failure payloads as well as
attributes: an attribute allowlist alone does not redact a span's exit cause.

The wallet subclass exposes the pinned SDK's protected proving seams without
untyped casts. Scope includes the organisation, and outgoing tags use it.

Run `npm run check` and the network entry from the reproduction instructions.
