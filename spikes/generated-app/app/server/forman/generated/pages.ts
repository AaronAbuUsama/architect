// Generated from examples/acme/generated/model/model.json. Do not edit.
import type { Page } from "../types.ts";

export const pages: ReadonlyArray<Page> = [
 {
  "path": "/live",
  "kind": "live",
  "title": "Live",
  "blocks": [
   {
    "block": "Live",
    "of": "system",
    "show": "kpis"
   },
   {
    "block": "Live",
    "of": "system",
    "show": "budgets"
   },
   {
    "block": "Live",
    "of": "system",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "system",
    "show": "events"
   },
   {
    "block": "Live",
    "of": "system",
    "show": "defects"
   }
  ]
 },
 {
  "path": "/environments",
  "kind": "environments",
  "title": "Environments",
  "blocks": [
   {
    "block": "Model",
    "of": "environments",
    "show": "all"
   },
   {
    "block": "Live",
    "of": "environments",
    "show": "status"
   }
  ]
 },
 {
  "path": "/allowance",
  "kind": "thing",
  "title": "allowance",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/thing.ts",
  "prose": "blueprint/things/allowance/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:allowance",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:allowance",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:allowance",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:allowance",
    "show": "machine"
   },
   {
    "block": "Model",
    "of": "thing:allowance",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:allowance",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:allowance",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/allowance/get",
  "kind": "operation",
  "title": "allowance.get",
  "about": "operation:allowance.get",
  "hash": "d37e32b8d27bcb3e",
  "file": "blueprint/things/allowance/verbs/get.ts",
  "prose": "blueprint/things/allowance/verbs/get.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:allowance.get",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:allowance.get",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:allowance.get",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:allowance.get",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:allowance.get",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.get",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.get",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:allowance.get",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:allowance.get",
    "show": "action"
   }
  ]
 },
 {
  "path": "/allowance/grant",
  "kind": "operation",
  "title": "allowance.grant",
  "about": "operation:allowance.grant",
  "hash": "1f1b19530837e4ed",
  "file": "blueprint/things/allowance/verbs/grant.ts",
  "prose": "blueprint/things/allowance/verbs/grant.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:allowance.grant",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:allowance.grant",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:allowance.grant",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:allowance.grant",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:allowance.grant",
    "show": "move"
   },
   {
    "block": "Model",
    "of": "operation:allowance.grant",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.grant",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.grant",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:allowance.grant",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:allowance.grant",
    "show": "action"
   }
  ]
 },
 {
  "path": "/allowance/revoke",
  "kind": "operation",
  "title": "allowance.revoke",
  "about": "operation:allowance.revoke",
  "hash": "840eec1fa79d3872",
  "file": "blueprint/things/allowance/verbs/revoke.ts",
  "prose": "blueprint/things/allowance/verbs/revoke.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:allowance.revoke",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:allowance.revoke",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:allowance.revoke",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:allowance.revoke",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:allowance.revoke",
    "show": "move"
   },
   {
    "block": "Model",
    "of": "operation:allowance.revoke",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.revoke",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.revoke",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:allowance.revoke",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:allowance.revoke",
    "show": "action"
   }
  ]
 },
 {
  "path": "/allowance/spend",
  "kind": "operation",
  "title": "allowance.spend",
  "about": "operation:allowance.spend",
  "hash": "aee8ecae8dc5fc81",
  "file": "blueprint/things/allowance/verbs/spend.ts",
  "prose": "blueprint/things/allowance/verbs/spend.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:allowance.spend",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:allowance.spend",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:allowance.spend",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:allowance.spend",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:allowance.spend",
    "show": "move"
   },
   {
    "block": "Model",
    "of": "operation:allowance.spend",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.spend",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:allowance.spend",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:allowance.spend",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:allowance.spend",
    "show": "action"
   }
  ]
 },
 {
  "path": "/allowance/machine",
  "kind": "machine",
  "title": "allowance machine",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/machine.ts",
  "prose": "blueprint/things/allowance/machine.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:allowance",
    "show": "machine"
   },
   {
    "block": "Live",
    "of": "thing:allowance",
    "show": "moves"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/allowance/events/AllowanceGranted",
  "kind": "event",
  "title": "AllowanceGranted",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/events.ts",
  "prose": "blueprint/things/allowance/events.AllowanceGranted.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "event:allowance.AllowanceGranted",
    "show": "fields"
   },
   {
    "block": "Live",
    "of": "event:allowance.AllowanceGranted",
    "show": "latest"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/allowance/events/AllowanceRevoked",
  "kind": "event",
  "title": "AllowanceRevoked",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/events.ts",
  "prose": "blueprint/things/allowance/events.AllowanceRevoked.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "event:allowance.AllowanceRevoked",
    "show": "fields"
   },
   {
    "block": "Live",
    "of": "event:allowance.AllowanceRevoked",
    "show": "latest"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/allowance/events/AllowanceSpent",
  "kind": "event",
  "title": "AllowanceSpent",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/events.ts",
  "prose": "blueprint/things/allowance/events.AllowanceSpent.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "event:allowance.AllowanceSpent",
    "show": "fields"
   },
   {
    "block": "Live",
    "of": "event:allowance.AllowanceSpent",
    "show": "latest"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/allowance/errors/AllowanceExceeded",
  "kind": "error",
  "title": "AllowanceExceeded",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/errors.ts",
  "prose": "blueprint/things/allowance/errors.AllowanceExceeded.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "error:allowance.AllowanceExceeded",
    "show": "summary"
   },
   {
    "block": "Live",
    "of": "error:allowance.AllowanceExceeded",
    "show": "seen"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/allowance/errors/AllowanceNotFound",
  "kind": "error",
  "title": "AllowanceNotFound",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/errors.ts",
  "prose": "blueprint/things/allowance/errors.AllowanceNotFound.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "error:allowance.AllowanceNotFound",
    "show": "summary"
   },
   {
    "block": "Live",
    "of": "error:allowance.AllowanceNotFound",
    "show": "seen"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/allowance/errors/AllowanceLimitTooHigh",
  "kind": "error",
  "title": "AllowanceLimitTooHigh",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/errors.ts",
  "prose": "blueprint/things/allowance/errors.AllowanceLimitTooHigh.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "error:allowance.AllowanceLimitTooHigh",
    "show": "summary"
   },
   {
    "block": "Live",
    "of": "error:allowance.AllowanceLimitTooHigh",
    "show": "seen"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/allowance/roles/grantee",
  "kind": "role",
  "title": "allowance.grantee",
  "about": "thing:allowance",
  "hash": "0029b5bcfd260e5f",
  "file": "blueprint/things/allowance/roles.ts",
  "prose": "blueprint/things/allowance/roles.grantee.md",
  "under": "/allowance",
  "blocks": [
   {
    "block": "Model",
    "of": "role:allowance.grantee",
    "show": "opens"
   },
   {
    "block": "Live",
    "of": "role:allowance.grantee",
    "show": "refused"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/api-key",
  "kind": "thing",
  "title": "api-key",
  "about": "thing:api-key",
  "hash": "6e46b72b0aa08b14",
  "file": "blueprint/things/api-key/thing.ts",
  "prose": "blueprint/things/api-key/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:api-key",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:api-key",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:api-key",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:api-key",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:api-key",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:api-key",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/api-key/create",
  "kind": "operation",
  "title": "api-key.create",
  "about": "operation:api-key.create",
  "hash": "08aae6601d29ec9c",
  "file": "blueprint/things/api-key/verbs/create.ts",
  "prose": "blueprint/things/api-key/verbs/create.md",
  "under": "/api-key",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:api-key.create",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:api-key.create",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:api-key.create",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:api-key.create",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:api-key.create",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:api-key.create",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:api-key.create",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:api-key.create",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:api-key.create",
    "show": "action"
   }
  ]
 },
 {
  "path": "/invitation",
  "kind": "thing",
  "title": "invitation",
  "about": "thing:invitation",
  "hash": "c480108780ac255d",
  "file": "blueprint/things/invitation/thing.ts",
  "prose": "blueprint/things/invitation/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:invitation",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:invitation",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:invitation",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:invitation",
    "show": "machine"
   },
   {
    "block": "Model",
    "of": "thing:invitation",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:invitation",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:invitation",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/invitation/accept",
  "kind": "operation",
  "title": "invitation.accept",
  "about": "operation:invitation.accept",
  "hash": "9b5d5f2a5e227711",
  "file": "blueprint/things/invitation/verbs/accept.ts",
  "prose": "blueprint/things/invitation/verbs/accept.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:invitation.accept",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:invitation.accept",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:invitation.accept",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:invitation.accept",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:invitation.accept",
    "show": "move"
   },
   {
    "block": "Model",
    "of": "operation:invitation.accept",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:invitation.accept",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:invitation.accept",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:invitation.accept",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:invitation.accept",
    "show": "action"
   }
  ]
 },
 {
  "path": "/invitation/revoke",
  "kind": "operation",
  "title": "invitation.revoke",
  "about": "operation:invitation.revoke",
  "hash": "273081eb20442e78",
  "file": "blueprint/things/invitation/verbs/revoke.ts",
  "prose": "blueprint/things/invitation/verbs/revoke.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:invitation.revoke",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:invitation.revoke",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:invitation.revoke",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:invitation.revoke",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:invitation.revoke",
    "show": "move"
   },
   {
    "block": "Model",
    "of": "operation:invitation.revoke",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:invitation.revoke",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:invitation.revoke",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:invitation.revoke",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:invitation.revoke",
    "show": "action"
   }
  ]
 },
 {
  "path": "/invitation/send",
  "kind": "operation",
  "title": "invitation.send",
  "about": "operation:invitation.send",
  "hash": "f760027d1cbbe846",
  "file": "blueprint/things/invitation/verbs/send.ts",
  "prose": "blueprint/things/invitation/verbs/send.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:invitation.send",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:invitation.send",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:invitation.send",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:invitation.send",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:invitation.send",
    "show": "move"
   },
   {
    "block": "Model",
    "of": "operation:invitation.send",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:invitation.send",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:invitation.send",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:invitation.send",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:invitation.send",
    "show": "action"
   }
  ]
 },
 {
  "path": "/invitation/machine",
  "kind": "machine",
  "title": "invitation machine",
  "about": "thing:invitation",
  "hash": "c480108780ac255d",
  "file": "blueprint/things/invitation/machine.ts",
  "prose": "blueprint/things/invitation/machine.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:invitation",
    "show": "machine"
   },
   {
    "block": "Live",
    "of": "thing:invitation",
    "show": "moves"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/invitation/events/InvitationAccepted",
  "kind": "event",
  "title": "InvitationAccepted",
  "about": "thing:invitation",
  "hash": "c480108780ac255d",
  "file": "blueprint/things/invitation/events.ts",
  "prose": "blueprint/things/invitation/events.InvitationAccepted.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "event:invitation.InvitationAccepted",
    "show": "fields"
   },
   {
    "block": "Live",
    "of": "event:invitation.InvitationAccepted",
    "show": "latest"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/invitation/events/InvitationRevoked",
  "kind": "event",
  "title": "InvitationRevoked",
  "about": "thing:invitation",
  "hash": "c480108780ac255d",
  "file": "blueprint/things/invitation/events.ts",
  "prose": "blueprint/things/invitation/events.InvitationRevoked.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "event:invitation.InvitationRevoked",
    "show": "fields"
   },
   {
    "block": "Live",
    "of": "event:invitation.InvitationRevoked",
    "show": "latest"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/invitation/events/InvitationSent",
  "kind": "event",
  "title": "InvitationSent",
  "about": "thing:invitation",
  "hash": "c480108780ac255d",
  "file": "blueprint/things/invitation/events.ts",
  "prose": "blueprint/things/invitation/events.InvitationSent.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "event:invitation.InvitationSent",
    "show": "fields"
   },
   {
    "block": "Live",
    "of": "event:invitation.InvitationSent",
    "show": "latest"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/invitation/roles/invitee",
  "kind": "role",
  "title": "invitation.invitee",
  "about": "thing:invitation",
  "hash": "c480108780ac255d",
  "file": "blueprint/things/invitation/roles.ts",
  "prose": "blueprint/things/invitation/roles.invitee.md",
  "under": "/invitation",
  "blocks": [
   {
    "block": "Model",
    "of": "role:invitation.invitee",
    "show": "opens"
   },
   {
    "block": "Live",
    "of": "role:invitation.invitee",
    "show": "refused"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/membership",
  "kind": "thing",
  "title": "membership",
  "about": "thing:membership",
  "hash": "7c2dc564f0e86a98",
  "file": "blueprint/things/membership/thing.ts",
  "prose": "blueprint/things/membership/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:membership",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:membership",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:membership",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:membership",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:membership",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:membership",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/membership/get",
  "kind": "operation",
  "title": "membership.get",
  "about": "operation:membership.get",
  "hash": "b2d66623a4335cca",
  "file": "blueprint/things/membership/verbs/get.ts",
  "prose": "blueprint/things/membership/verbs/get.md",
  "under": "/membership",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:membership.get",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:membership.get",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:membership.get",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:membership.get",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:membership.get",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:membership.get",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:membership.get",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:membership.get",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:membership.get",
    "show": "action"
   }
  ]
 },
 {
  "path": "/membership/roles/holder",
  "kind": "role",
  "title": "membership.holder",
  "about": "thing:membership",
  "hash": "7c2dc564f0e86a98",
  "file": "blueprint/things/membership/roles.ts",
  "prose": "blueprint/things/membership/roles.holder.md",
  "under": "/membership",
  "blocks": [
   {
    "block": "Model",
    "of": "role:membership.holder",
    "show": "opens"
   },
   {
    "block": "Live",
    "of": "role:membership.holder",
    "show": "refused"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/organization",
  "kind": "thing",
  "title": "organization",
  "about": "thing:organization",
  "hash": "d95f8ccf9838cc7b",
  "file": "blueprint/things/organization/thing.ts",
  "prose": "blueprint/things/organization/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:organization",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:organization",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:organization",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:organization",
    "show": "machine"
   },
   {
    "block": "Model",
    "of": "thing:organization",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:organization",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:organization",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/organization/create",
  "kind": "operation",
  "title": "organization.create",
  "about": "operation:organization.create",
  "hash": "88a1c1cad20fbba0",
  "file": "blueprint/things/organization/verbs/create.ts",
  "prose": "blueprint/things/organization/verbs/create.md",
  "under": "/organization",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:organization.create",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:organization.create",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:organization.create",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:organization.create",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:organization.create",
    "show": "move"
   },
   {
    "block": "Model",
    "of": "operation:organization.create",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:organization.create",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:organization.create",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:organization.create",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:organization.create",
    "show": "action"
   }
  ]
 },
 {
  "path": "/organization/get",
  "kind": "operation",
  "title": "organization.get",
  "about": "operation:organization.get",
  "hash": "45802f5f1bd67a6d",
  "file": "blueprint/things/organization/verbs/get.ts",
  "prose": "blueprint/things/organization/verbs/get.md",
  "under": "/organization",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:organization.get",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:organization.get",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:organization.get",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:organization.get",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:organization.get",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:organization.get",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:organization.get",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:organization.get",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:organization.get",
    "show": "action"
   }
  ]
 },
 {
  "path": "/organization/machine",
  "kind": "machine",
  "title": "organization machine",
  "about": "thing:organization",
  "hash": "d95f8ccf9838cc7b",
  "file": "blueprint/things/organization/machine.ts",
  "prose": "blueprint/things/organization/machine.md",
  "under": "/organization",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:organization",
    "show": "machine"
   },
   {
    "block": "Live",
    "of": "thing:organization",
    "show": "moves"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/organization/events/OrganizationCreated",
  "kind": "event",
  "title": "OrganizationCreated",
  "about": "thing:organization",
  "hash": "d95f8ccf9838cc7b",
  "file": "blueprint/things/organization/events.ts",
  "prose": "blueprint/things/organization/events.OrganizationCreated.md",
  "under": "/organization",
  "blocks": [
   {
    "block": "Model",
    "of": "event:organization.OrganizationCreated",
    "show": "fields"
   },
   {
    "block": "Live",
    "of": "event:organization.OrganizationCreated",
    "show": "latest"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/organization/roles/owner",
  "kind": "role",
  "title": "organization.owner",
  "about": "thing:organization",
  "hash": "d95f8ccf9838cc7b",
  "file": "blueprint/things/organization/roles.ts",
  "prose": "blueprint/things/organization/roles.owner.md",
  "under": "/organization",
  "blocks": [
   {
    "block": "Model",
    "of": "role:organization.owner",
    "show": "opens"
   },
   {
    "block": "Live",
    "of": "role:organization.owner",
    "show": "refused"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/person",
  "kind": "thing",
  "title": "person",
  "about": "thing:person",
  "hash": "1595aad527217150",
  "file": "blueprint/things/person/thing.ts",
  "prose": "blueprint/things/person/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:person",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:person",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:person",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:person",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:person",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:person",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/person/sign-up",
  "kind": "operation",
  "title": "person.sign-up",
  "about": "operation:person.sign-up",
  "hash": "a07b2e3beea84684",
  "file": "blueprint/things/person/verbs/sign-up.ts",
  "prose": "blueprint/things/person/verbs/sign-up.md",
  "under": "/person",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:person.sign-up",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:person.sign-up",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:person.sign-up",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:person.sign-up",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:person.sign-up",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:person.sign-up",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:person.sign-up",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:person.sign-up",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:person.sign-up",
    "show": "action"
   }
  ]
 },
 {
  "path": "/person/errors/PersonEmailTaken",
  "kind": "error",
  "title": "PersonEmailTaken",
  "about": "thing:person",
  "hash": "1595aad527217150",
  "file": "blueprint/things/person/errors.ts",
  "prose": "blueprint/things/person/errors.PersonEmailTaken.md",
  "under": "/person",
  "blocks": [
   {
    "block": "Model",
    "of": "error:person.PersonEmailTaken",
    "show": "summary"
   },
   {
    "block": "Live",
    "of": "error:person.PersonEmailTaken",
    "show": "seen"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/session",
  "kind": "thing",
  "title": "session",
  "about": "thing:session",
  "hash": "1fa5923e2d4a38d4",
  "file": "blueprint/things/session/thing.ts",
  "prose": "blueprint/things/session/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:session",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:session",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:session",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:session",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:session",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:session",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/session/show",
  "kind": "operation",
  "title": "session.show",
  "about": "operation:session.show",
  "hash": "d6972d746c66f735",
  "file": "blueprint/things/session/verbs/show.ts",
  "prose": "blueprint/things/session/verbs/show.md",
  "under": "/session",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:session.show",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:session.show",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:session.show",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:session.show",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:session.show",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:session.show",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:session.show",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:session.show",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:session.show",
    "show": "action"
   }
  ]
 },
 {
  "path": "/session/sign-in",
  "kind": "operation",
  "title": "session.sign-in",
  "about": "operation:session.sign-in",
  "hash": "631917ddeff4685a",
  "file": "blueprint/things/session/verbs/sign-in.ts",
  "prose": "blueprint/things/session/verbs/sign-in.md",
  "under": "/session",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:session.sign-in",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:session.sign-in",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:session.sign-in",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:session.sign-in",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:session.sign-in",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:session.sign-in",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:session.sign-in",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:session.sign-in",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:session.sign-in",
    "show": "action"
   }
  ]
 },
 {
  "path": "/session/errors/SessionCredentialsWrong",
  "kind": "error",
  "title": "SessionCredentialsWrong",
  "about": "thing:session",
  "hash": "1fa5923e2d4a38d4",
  "file": "blueprint/things/session/errors.ts",
  "prose": "blueprint/things/session/errors.SessionCredentialsWrong.md",
  "under": "/session",
  "blocks": [
   {
    "block": "Model",
    "of": "error:session.SessionCredentialsWrong",
    "show": "summary"
   },
   {
    "block": "Live",
    "of": "error:session.SessionCredentialsWrong",
    "show": "seen"
   },
   {
    "block": "Prose"
   }
  ]
 },
 {
  "path": "/system",
  "kind": "thing",
  "title": "system",
  "about": "thing:system",
  "hash": "f59c02fd744afb41",
  "file": "blueprint/things/system/thing.ts",
  "prose": "blueprint/things/system/thing.md",
  "blocks": [
   {
    "block": "Model",
    "of": "thing:system",
    "show": "fields"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Model",
    "of": "thing:system",
    "show": "operations"
   },
   {
    "block": "Live",
    "of": "thing:system",
    "show": "counts"
   },
   {
    "block": "Model",
    "of": "thing:system",
    "show": "events"
   },
   {
    "block": "Model",
    "of": "thing:system",
    "show": "errors"
   },
   {
    "block": "Model",
    "of": "thing:system",
    "show": "roles"
   }
  ]
 },
 {
  "path": "/system/health",
  "kind": "operation",
  "title": "system.health",
  "about": "operation:system.health",
  "hash": "354821b9c37665dc",
  "file": "blueprint/things/system/verbs/health.ts",
  "prose": "blueprint/things/system/verbs/health.md",
  "under": "/system",
  "blocks": [
   {
    "block": "Model",
    "of": "operation:system.health",
    "show": "summary"
   },
   {
    "block": "Prose"
   },
   {
    "block": "Live",
    "of": "operation:system.health",
    "show": "calls"
   },
   {
    "block": "Model",
    "of": "operation:system.health",
    "show": "payload"
   },
   {
    "block": "Model",
    "of": "operation:system.health",
    "show": "answer"
   },
   {
    "block": "Model",
    "of": "operation:system.health",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:system.health",
    "show": "refusals"
   },
   {
    "block": "Live",
    "of": "operation:system.health",
    "show": "recent"
   },
   {
    "block": "Live",
    "of": "operation:system.health",
    "show": "trace"
   },
   {
    "block": "Model",
    "of": "operation:system.health",
    "show": "action"
   }
  ]
 }
];
