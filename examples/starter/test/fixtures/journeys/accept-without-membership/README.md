# accept-without-membership

**Replaces:** `implementation/handlers/invitation/accept.ts` with `invitation/accept.ts` here.
**Breaks:** the invitation moves to `accepted` and the answer carries a fresh `mem_` id, but no membership row is written.
**Must fail:** journey `invite and accept`, step "olga reads her membership: she is a member, not an owner" (`membership.get` finds nothing, so the read is refused or empty instead of answering role "member"). Steps up to and including "olga accepts and joins ada's organisation" still pass, so only the later read exposes it.
**Failure shape:** `invite and accept ✘ "olga reads her membership: ...": expected role "member"` (or the read refused where it should answer).
