# What the chat answered

Each answer is verbatim from `tools/ask.sh` (the stand-in for the app's chat: the screen from the app's own `view-screen`, the app's actions as the only tools). Run on 18 November 2026 against a running acme.

## 1. "why did spend refuse ada?" (first run)

Spend refused Ada with **NotAllowed** (HTTP 403) because she doesn't hold the **`allowance.grantee`** role on that allowance. In the model, `allowance.spend` allows only that role (`blueprint/things/allowance/verbs/spend.ts`).

- **Trace:** `31dc3198c8c322d1f720d69f5b3baf29`. The app called as **ada** (`per_1rl44woypb4zt45w`) from the frontend, with `{ allowance: "alw_cx1eo3tr0w37l8sy", amount: "20", memo: "lunch" }`.
- **Where it stopped:** the permission check turned it away before the operation itself ran. The trace has no `load` or `record` step, only the HTTP request and one sqlite query. The allowance's state and the $20 amount were never checked, so this is not `AllowanceExceeded` or `AllowanceNotActive`.
- **It keeps happening:** Ada has 4 identical NotAllowed refusals in the last 30 minutes. Three came from the frontend and one (`6cb7d094…`) came over plain HTTP.

The app's output cut off the part of the role page that names who the grantee of `alw_cx1eo3tr0w37l8sy` actually is, so I can't confirm it from here. Most likely the allowance was granted to someone else, or the grant to Ada never happened or was revoked. To check, open `/allowance/roles/grantee` or look for `allowance.grant` calls on that allowance id.

## 2. A trace not on screen, and one that does not exist (before the fix)

**Trace `c01ab880469801fd4907ce295a06947c`** was a successful `allowance.revoke` call. The app revoked allowance `alw_g3afq4azj13ncq1o` and answered HTTP 200 with an empty answer. The model's rule for revoke allows a move from `active` or `exhausted` to `revoked` and emits `AllowanceRevoked`, which is what happened. Only the owner of the allowance's organization may call it (`role-of organization.owner` via `allowance.organization`). The app called as person `per_1rl44woypb4zt45w`. The trace doesn't show whether that person is ada, the user on this screen. The request took 13 ms in total and the revoke itself took 2 ms (one database update, then a batch write). That's well inside the 150 ms p95 budget, and it wasn't a replay.

**Trace `0123456789abcdef0123456789abcdef`** doesn't exist in the local telemetry. The app read all 343 traces from the last 30 minutes and found no match, so there's nothing to report for it. The ID also looks like a placeholder rather than a real trace.

It said "the app called as" for a call the app did not make. Fixed in `trace`: it now says `madeBy` and names the cast member behind `principal.person`.

## 3. The same trace after the fix

Trace `c01ab880469801fd4907ce295a06947c` was a successful **`allowance.revoke`** on allowance `alw_g3afq4azj13ncq1o`. It returned HTTP 200 and emitted `AllowanceRevoked`. The whole POST took 13 ms. The operation itself took 2 ms: it read twice from sqlite, then ran the `allowance.revoke.update` step and wrote one batch. That's well under its 150 ms p95 budget.

The rule in the model is in `blueprint/things/allowance/verbs/revoke.ts`. Only an `organization.owner` of the allowance's organization may revoke it. Revoking moves the allowance from `active` or `exhausted` to `revoked`, and after that nothing more can be spent from it. If the caller isn't an owner, the call is refused with `NotAllowed`. If the allowance is in some other state, it's refused with `AllowanceNotActive`. Neither refusal happened here, so the caller passed the owner check.

It was called as **ada** (`per_1rl44woypb4zt45w`). The request didn't come from this app, though: there's no entry for it in the app's call log. Something else made it while acting as ada, such as another client, a script or `prove`.

## 4. "why did spend refuse ada?" (final run)

Spend refused Ada because the access check failed. In trace `31dc3198c8c322d1f720d69f5b3baf29`, `allowance.spend` returned **NotAllowed** (HTTP 403) after 12 ms. The refusal came before the operation's span opened, so the operation itself never ran.

- **The rule:** in `blueprint/things/allowance/verbs/spend.ts`, only someone with the `allowance.grantee` role on that allowance can spend from it. NotAllowed means the app didn't treat Ada as the grantee of `alw_cx1eo3tr0w37l8sy`.
- **Who the app called as:** `ada` (person `per_1rl44woypb4zt45w`) from the frontend, with `{ allowance: alw_cx1eo3tr0w37l8sy, amount: "20", memo: "lunch" }`.
- **It's a pattern:** all 4 of Ada's spend attempts in the last 30 minutes were refused NotAllowed (3 from the frontend, 1 over HTTP).

This isn't about the amount. A spend over the remaining balance would be refused as AllowanceExceeded, and a spend on an inactive allowance as AllowanceNotActive.

The trace doesn't record which roles Ada holds, because the check happens before the principal is logged. To confirm, look at who the grantee of `alw_cx1eo3tr0w37l8sy` is. Most likely the allowance belongs to someone else, or Ada was never given the grantee role on it.
