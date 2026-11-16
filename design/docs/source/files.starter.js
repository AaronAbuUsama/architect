const FILES = [
/* ===== acme: the starter project ===== */
{ p: "acme/architect.config.ts", k: "write", n: "The project's one config file. Names the outputs (standard names by default), the auth adapter and where telemetry goes. Everything else comes from the layout.", c:
`import { Blueprint, Auth, Telemetry } from "@architect/blueprint"

export default Blueprint.config({
  name: "acme",
  // The standard names. Rename any output here; the folders follow.
  outputs: { api: "api", sdk: "sdk", cli: "acme", mcp: false, portal: true },
  auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true }),
  telemetry: Telemetry.otlp({ sink: "axiom", dataset: "acme" }),
})` },
{ p: "acme/blueprint/environments/local.ts", k: "scaffold", n: "One file per environment. Evidence and verdicts are kept per environment; generated/infra holds an Alchemy stack for each one that needs a cloud.", c:
`import { Blueprint, Identity } from "@architect/blueprint"

export default Blueprint.environment("local", {
  runs: "on this machine",
  identity: Identity.testPrincipals,          // fixed test people, no sign-in
})` },
{ p: "acme/blueprint/environments/test.ts", k: "scaffold", n: "", c:
`import { Blueprint, Cloud, Identity } from "@architect/blueprint"

export default Blueprint.environment("test", {
  runs: "a fresh world for each pull request",
  lifetime: "2 hours",                         // created and destroyed as one unit, with an owner and an expiry
  identity: Identity.testPrincipals,
  cloud: Cloud.cloudflare({ database: Cloud.neon() }),
})` },
{ p: "acme/blueprint/environments/staging.ts", k: "scaffold", n: "", c:
`import { Blueprint, Cloud, Identity } from "@architect/blueprint"

export default Blueprint.environment("staging", {
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.neon() }),
})` },
{ p: "acme/blueprint/environments/production.ts", k: "scaffold", n: "", c:
`import { Blueprint, Cloud, Identity } from "@architect/blueprint"

export default Blueprint.environment("production", {
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.neon() }),
})` },
{ p: "acme/blueprint/things/organization/roles.ts", k: "scaffold", n: "Roles live with the thing they're scoped to. Anyone and signed-in are built into Architect, so nobody declares them.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "./thing"
import { Membership } from "../membership/thing"

export const owner = Blueprint.role("owner", {
  of: Organization,
  holds: (principal, organization) => Membership.holds(organization, principal, ["owner"]),
})

export const member = Blueprint.role("member", {
  of: Organization,
  holds: (principal, organization) => Membership.holds(organization, principal, ["owner", "member"]),
})` },
{ p: "acme/blueprint/things/invitation/roles.ts", k: "scaffold", n: "", c:
`import { Blueprint } from "@architect/blueprint"
import { Invitation } from "./thing"

export const invitee = Blueprint.role("invitee", {
  of: Invitation,
  holds: (principal, invitation) => principal.email === invitation.email,
})` },
{ p: "acme/blueprint/things/system/thing.ts", k: "write", n: "The application itself, as a thing. Its operations are the ones every project has: health and version. No machine: it has no lifecycle.", c:
`import { Blueprint } from "@architect/blueprint"

export const System = Blueprint.thing("system", {
  description: "The running application itself.",
  fields: {},
})` },
{ p: "acme/blueprint/things/system/verbs/health.ts", k: "write", n: "The operation's name, system.health, comes from this file's path. It is never typed anywhere.", c:
`import { Blueprint, Schema } from "@architect/blueprint"
import { System } from "../thing"

export default Blueprint.operation(System, {
  description: "Is the application up, and can it reach its database?",
  payload: {},
  answer: { status: Schema.Literal("ok"), database: Schema.Literal("ok") },
  allowed: [Blueprint.anyone],
  steps: [Blueprint.step.database("system.health.ping")],
  budget: { p95: "50 millis" },
})` },
{ p: "acme/blueprint/things/system/verbs/version.ts", k: "write", n: "Which build is running, in which environment.", c:
`import { Blueprint, Schema } from "@architect/blueprint"
import { System } from "../thing"

export default Blueprint.operation(System, {
  description: "Which revision and environment answered.",
  payload: {},
  answer: { revision: Schema.String, environment: Schema.String },
  allowed: [Blueprint.anyone],
  budget: { p95: "20 millis" },
})` },
{ p: "acme/blueprint/things/session/thing.ts", k: "write", n: "A signed-in session. Its operations are supplied by Architect's Better Auth adapter, so there are no handlers to write for them.", c:
`import { Blueprint } from "@architect/blueprint"

export const Session = Blueprint.thing("session", {
  description: "A principal's signed-in session, issued by Better Auth.",
  fields: { id: Blueprint.id("ses"), principal: Blueprint.principalId, expiresAt: Blueprint.time },
  handledBy: Blueprint.auth,      // session.sign-in, sign-out and show are served by the auth adapter
})` },
{ p: "acme/blueprint/things/session/verbs/sign-in.ts", k: "write", n: "Declared like any other operation, so it has an SDK call, a CLI command, docs, telemetry and evals. Its handler is Architect's.", c:
`import { Blueprint, Schema } from "@architect/blueprint"
import { Session } from "../thing"
import { SessionCredentialsWrong } from "../errors"

export default Blueprint.operation(Session, {
  description: "Sign in with email and password, or by device code from the CLI.",
  payload: { email: Blueprint.email, password: Blueprint.secret },
  answer: { session: Session.fields.id },
  errors: [SessionCredentialsWrong],
  allowed: [Blueprint.anyone],
  budget: { p95: "400 millis" },
})` },
{ p: "acme/blueprint/things/session/verbs/show.ts", k: "write", n: "Who am I. The CLI's 'acme session show'.", c:
`import { Blueprint } from "@architect/blueprint"
import { Session } from "../thing"

export default Blueprint.operation(Session, {
  description: "The current principal and its session.",
  payload: {},
  answer: { principal: Blueprint.principal, session: Session.fields.id },
  allowed: [Blueprint.signedIn],
  budget: { p95: "100 millis" },
})` },
{ p: "acme/blueprint/things/session/errors.ts", k: "write", n: "Each error is named <Thing><Reason>, carries what a caller needs to act on it, and has an exit code.", c:
`import { Blueprint } from "@architect/blueprint"

export class SessionCredentialsWrong extends Blueprint.error("SessionCredentialsWrong", {}, { exit: 10 }) {}` },
{ p: "acme/blueprint/things/organization/thing.ts", k: "write", n: "An organisation. Roles are scoped to one, which is why the starter has it from day one.", c:
`import { Blueprint, Schema } from "@architect/blueprint"

export const Organization = Blueprint.thing("organization", {
  description: "A company or team that people belong to.",
  fields: {
    id: Blueprint.id("org"),
    name: Schema.NonEmptyTrimmedString,
    slug: Blueprint.slug,
  },
})` },
{ p: "acme/blueprint/things/organization/machine.ts", k: "write", n: "Its lifecycle. Every operation that changes an organisation names one of these moves, so 'not from this state' refusals are generated, never written.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "./thing"
import { OrganizationCreated, OrganizationArchived } from "./events"

export const machine = Blueprint.machine(Organization, {
  start: "active",
  states: ["active", "archived"],
  moves: {
    create:  { from: [],         to: "active",   emits: OrganizationCreated },
    archive: { from: ["active"], to: "archived", emits: OrganizationArchived },
  },
})` },
{ p: "acme/blueprint/things/organization/events.ts", k: "write", n: "Events are named <Thing><PastTense> and say exactly what they carry.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "./thing"

export const OrganizationCreated = Blueprint.event("OrganizationCreated", {
  organization: Organization.fields.id,
  createdBy: Blueprint.principalId,
})

export const OrganizationArchived = Blueprint.event("OrganizationArchived", {
  organization: Organization.fields.id,
})` },
{ p: "acme/blueprint/things/organization/errors.ts", k: "write", n: "Refusals that depend on data. Refusals that depend on state (archived) come from the machine.", c:
`import { Blueprint } from "@architect/blueprint"

export class OrganizationNotFound extends Blueprint.error("OrganizationNotFound", {}, { exit: 20 }) {}
export class OrganizationSlugTaken extends Blueprint.error("OrganizationSlugTaken", { slug: Blueprint.slug }, { exit: 21 }) {}` },
{ p: "acme/blueprint/things/organization/verbs/create.ts", k: "write", n: "organization.create. Its move is 'create', so it starts the organisation's machine and emits OrganizationCreated; the evals check both.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "../thing"
import { machine } from "../machine"
import { OrganizationSlugTaken } from "../errors"

export default Blueprint.operation(Organization, {
  description: "Found an organisation; the caller becomes its owner.",
  payload: { name: Organization.fields.name, slug: Organization.fields.slug },
  answer: { organization: Organization.fields.id },
  move: machine.moves.create,
  errors: [OrganizationSlugTaken],
  allowed: [Blueprint.signedIn],
  steps: [Blueprint.step.database("organization.create.insert"), Blueprint.step.database("organization.create.owner")],
  budget: { p95: "250 millis" },
})` },
{ p: "acme/blueprint/things/organization/verbs/archive.ts", k: "write", n: "Only an owner may archive. Anyone else gets NotAllowed; an organisation already archived gets OrganizationNotActive. Both generated.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "../thing"
import { machine } from "../machine"
import { owner } from "../roles"

export default Blueprint.operation(Organization, {
  description: "Archive an organisation. Its members keep read access.",
  payload: { organization: Organization.fields.id },
  answer: {},
  move: machine.moves.archive,
  allowed: [owner],
  budget: { p95: "200 millis" },
})` },
{ p: "acme/blueprint/things/organization/verbs/show.ts", k: "write", n: "A read. No move, so it changes nothing and emits nothing; the evals check that too.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "../thing"
import { machine } from "../machine"
import { OrganizationNotFound } from "../errors"
import { member } from "../roles"

export default Blueprint.operation(Organization, {
  description: "One organisation, as its members see it.",
  payload: { organization: Organization.fields.id },
  answer: { organization: Organization.view, state: machine.state },
  errors: [OrganizationNotFound],
  allowed: [member],
  budget: { p95: "80 millis" },
})` },
{ p: "acme/blueprint/things/membership/thing.ts", k: "write", n: "Who belongs to which organisation, with which role. Backed by Better Auth's organisation plugin.", c:
`import { Blueprint, Schema } from "@architect/blueprint"
import { Organization } from "../organization/thing"

export const Membership = Blueprint.thing("membership", {
  description: "A principal's place in an organisation.",
  fields: {
    organization: Organization.fields.id,
    principal: Blueprint.principalId,
    role: Schema.Literal("owner", "member"),
  },
  storedBy: Blueprint.auth.organizations,
})` },
{ p: "acme/blueprint/things/membership/verbs/change-role.ts", k: "write", n: "membership.change-role. Kebab-case file, so the CLI command is 'acme membership change-role'.", c:
`import { Blueprint } from "@architect/blueprint"
import { Membership } from "../thing"
import { MembershipLastOwner } from "../errors"
import { owner } from "../../organization/roles"

export default Blueprint.operation(Membership, {
  description: "Make a member an owner, or an owner a member.",
  payload: { organization: Membership.fields.organization, principal: Membership.fields.principal, role: Membership.fields.role },
  answer: {},
  errors: [MembershipLastOwner],
  allowed: [owner],
  budget: { p95: "200 millis" },
})` },
{ p: "acme/blueprint/things/membership/errors.ts", k: "write", n: "", c:
`import { Blueprint } from "@architect/blueprint"

export class MembershipLastOwner extends Blueprint.error("MembershipLastOwner", {}, { exit: 30 }) {}` },
{ p: "acme/blueprint/things/invitation/thing.ts", k: "write", n: "An invitation to join an organisation.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "../organization/thing"

export const Invitation = Blueprint.thing("invitation", {
  description: "An offer to join an organisation, sent to an email address.",
  fields: {
    id: Blueprint.id("inv"),
    organization: Organization.fields.id,
    email: Blueprint.email,
    invitedBy: Blueprint.principalId,
  },
})` },
{ p: "acme/blueprint/things/invitation/machine.ts", k: "write", n: "Four states, four moves. accept, decline and revoke are only possible from pending; every other state refuses with InvitationNotPending, generated.", c:
`import { Blueprint } from "@architect/blueprint"
import { Invitation } from "./thing"
import * as Events from "./events"

export const machine = Blueprint.machine(Invitation, {
  start: "pending",
  states: ["pending", "accepted", "declined", "revoked"],
  moves: {
    send:    { from: [],          to: "pending",  emits: Events.InvitationSent },
    accept:  { from: ["pending"], to: "accepted", emits: Events.InvitationAccepted },
    decline: { from: ["pending"], to: "declined", emits: Events.InvitationDeclined },
    revoke:  { from: ["pending"], to: "revoked",  emits: Events.InvitationRevoked },
  },
  notFrom: { exit: 40 },                 // generated as InvitationNotPending: the thing, "Not", the state the moves start from
})` },
{ p: "acme/blueprint/things/invitation/events.ts", k: "write", n: "", c:
`import { Blueprint } from "@architect/blueprint"
import { Invitation } from "./thing"
import { Membership } from "../membership/thing"

export const InvitationSent = Blueprint.event("InvitationSent", { invitation: Invitation.fields.id, email: Invitation.fields.email })
export const InvitationAccepted = Blueprint.event("InvitationAccepted", { invitation: Invitation.fields.id, role: Membership.fields.role })
export const InvitationDeclined = Blueprint.event("InvitationDeclined", { invitation: Invitation.fields.id })
export const InvitationRevoked = Blueprint.event("InvitationRevoked", { invitation: Invitation.fields.id })` },
{ p: "acme/blueprint/things/invitation/errors.ts", k: "write", n: "", c:
`import { Blueprint } from "@architect/blueprint"

export class InvitationNotFound extends Blueprint.error("InvitationNotFound", {}, { exit: 41 }) {}
export class InvitationAlreadyMember extends Blueprint.error("InvitationAlreadyMember", {}, { exit: 42 }) {}` },
{ p: "acme/blueprint/things/invitation/verbs/send.ts", k: "write", n: "", c:
`import { Blueprint } from "@architect/blueprint"
import { Invitation } from "../thing"
import { machine } from "../machine"
import { InvitationAlreadyMember } from "../errors"
import { owner } from "../../organization/roles"

export default Blueprint.operation(Invitation, {
  description: "Invite someone to an organisation by email.",
  payload: { organization: Invitation.fields.organization, email: Invitation.fields.email },
  answer: { invitation: Invitation.fields.id },
  move: machine.moves.send,
  errors: [InvitationAlreadyMember],
  allowed: [owner.of("organization")],      // owner of the payload's organisation
  steps: [Blueprint.step.database("invitation.send.insert"), Blueprint.step.wait("invitation.send.email")],
  budget: { p95: "400 millis" },
})` },
{ p: "acme/blueprint/things/invitation/verbs/accept.ts", k: "write", n: "The worked example used across these docs. Every generated file for invitation.accept is derived from this one path: see the links below.", c:
`import { Blueprint } from "@architect/blueprint"
import { Invitation } from "../thing"
import { Membership } from "../../membership/thing"
import { machine } from "../machine"
import { InvitationNotFound } from "../errors"
import { invitee } from "../roles"

export default Blueprint.operation(Invitation, {
  description: "Accept an invitation and become a member.",
  payload: { invitation: Invitation.fields.id },
  answer: { organization: Invitation.fields.organization, role: Membership.fields.role },
  move: machine.moves.accept,                 // so InvitationNotPending is refused from every other state
  errors: [InvitationNotFound],
  allowed: [invitee],                         // anyone else: NotAllowed, generated
  steps: [
    Blueprint.step.database("invitation.accept.read"),
    Blueprint.step.database("invitation.accept.join"),
  ],
  budget: { p95: "300 millis" },              // a target, never a failure
})` },
{ p: "acme/blueprint/things/api-key/verbs/create.ts", k: "write", n: "API keys are how agents and services become principals (kind agent or service).", c:
`import { Blueprint, Schema } from "@architect/blueprint"
import { ApiKey } from "../thing"
import { owner } from "../../organization/roles"

export default Blueprint.operation(ApiKey, {
  description: "Create an API key for an agent or a service in an organisation.",
  payload: { organization: ApiKey.fields.organization, kind: Schema.Literal("agent", "service"), name: Schema.NonEmptyTrimmedString },
  answer: { key: Blueprint.secret, apiKey: ApiKey.fields.id },   // the key is shown once
  allowed: [owner.of("organization")],
  budget: { p95: "200 millis" },
})` },
{ p: "acme/blueprint/journeys/invite-and-accept.ts", k: "write", n: "Journeys are part of the blueprint. File name: the journey's name in kebab-case. The builder of an operation never writes its journeys; check enforces it.", c:
`import { Blueprint, expect, refuses } from "@architect/blueprint"
import { owner } from "../things/organization/roles"
import { invitee } from "../things/invitation/roles"
import { machine } from "../things/invitation/machine"

export default Blueprint.journey("invite and accept", {
  cast: { ada: owner, olga: invitee },
  starts: "founded",                                  // a starting world: ada owns organisation "acme-demo"
  steps: (s) => [
    s.step("ada invites olga", s.ada.invitation.send({ organization: s.world.organization, email: s.olga.email })),
    s.step("olga accepts", s.olga.invitation.accept({ invitation: s.last.invitation }),
      expect((answer) => answer.role).toBe("member")),
    s.step("olga can't accept twice", s.olga.invitation.accept({ invitation: s.first.invitation }),
      refuses(machine.notFrom)),
    s.step("olga can see the organisation", s.olga.organization.show({ organization: s.world.organization })),
  ],
})` },
{ p: "acme/blueprint/journeys/health-is-up.ts", k: "write", n: "The first journey every project has, proven from the first commit.", c:
`import { Blueprint, expect } from "@architect/blueprint"

export default Blueprint.journey("health is up", {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
    s.step("the application answers", s.visitor.system.health({}), expect((a) => a.status).toBe("ok")),
    s.step("it says which build", s.visitor.system.version({}), expect((a) => a.environment).toBe(s.environment.name)),
  ],
})` },
{ p: "acme/blueprint/journeys/sign-up-and-sign-in.ts", k: "write", n: "", c:
`import { Blueprint, expect, refuses } from "@architect/blueprint"
import { SessionCredentialsWrong } from "../things/session/errors"

export default Blueprint.journey("sign up and sign in", {
  cast: { newcomer: Blueprint.anyone },
  steps: (s) => [
    s.step("newcomer signs up", s.newcomer.person.signUp({ email: s.newcomer.email, password: s.newcomer.password })),
    s.step("wrong password is refused", s.newcomer.session.signIn({ email: s.newcomer.email, password: "wrong" }),
      refuses(SessionCredentialsWrong)),
    s.step("newcomer signs in", s.newcomer.session.signIn({ email: s.newcomer.email, password: s.newcomer.password })),
    s.step("newcomer is who they say", s.newcomer.session.show({}), expect((a) => a.principal.email).toBe(s.newcomer.email)),
  ],
})` },
{ p: "acme/blueprint/starting-worlds/founded.ts", k: "write", n: "A named state a journey can start from, made by declared operations, never by hand.", c:
`import { Blueprint } from "@architect/blueprint"
import { owner } from "../things/organization/roles"

export default Blueprint.startingWorld("founded", {
  cast: { ada: owner },
  makes: (s) => [
    s.ada.person.signUp({ email: s.ada.email, password: s.ada.password }),
    s.ada.organization.create({ name: "Acme Demo", slug: "acme-demo" }),
  ],
  gives: (s) => ({ organization: s.last.organization }),
})` },
{ p: "acme/implementation/handlers/invitation/accept.ts", k: "scaffold", n: "The logic inside an operation. Scaffolded once its declaration had no blanks left, at the path that mirrors it, with its imports and steps laid out; yours from then on.", c:
`import { Effect } from "effect"
import { Handlers } from "@acme/api/server"
import { Invitations, Memberships } from "../../services"

// The type of this function is generated from verbs/accept.ts: change the declaration and this stops compiling.
export default Handlers.invitation.accept(({ invitation }, { principal, move }) =>
  Effect.gen(function* () {
    const found = yield* Invitations.find(invitation)               // fails InvitationNotFound if missing
    yield* move(found)                                              // the machine's move: refuses if not pending,
                                                                    // emits InvitationAccepted, records the state
    yield* Memberships.join(found.organization, principal, "member")
    return { organization: found.organization, role: "member" as const }
  }))` },
{ p: "acme/implementation/handlers/organization/create.ts", k: "scaffold", n: "", c:
`import { Effect } from "effect"
import { Handlers } from "@acme/api/server"
import { Organizations, Memberships } from "../../services"

export default Handlers.organization.create(({ name, slug }, { principal, move }) =>
  Effect.gen(function* () {
    const organization = yield* Organizations.insert({ name, slug })   // fails OrganizationSlugTaken
    yield* move(organization)
    yield* Memberships.join(organization.id, principal, "owner")
    return { organization: organization.id }
  }))` },
{ p: "acme/implementation/handlers/system/health.ts", k: "scaffold", n: "", c:
`import { Effect } from "effect"
import { Handlers } from "@acme/api/server"
import { Database } from "../../services"

export default Handlers.system.health(() =>
  Effect.gen(function* () {
    yield* Database.ping
    return { status: "ok" as const, database: "ok" as const }
  }))` },
{ p: "acme/implementation/services.ts", k: "scaffold", n: "Your own Effect services: the database access the handlers use. Architect scaffolds the file; what is in it is yours.", c:
`import { Effect, Layer } from "effect"
import { SqlClient } from "@effect/sql"

// Each service is an Effect service. Its functions are spans named by declared steps.
export class Invitations extends Effect.Service<Invitations>()("acme/Invitations", { /* ... */ }) {}
export class Memberships extends Effect.Service<Memberships>()("acme/Memberships", { /* ... */ }) {}
export class Organizations extends Effect.Service<Organizations>()("acme/Organizations", { /* ... */ }) {}
export class Database extends Effect.Service<Database>()("acme/Database", { /* ... */ }) {}` },
{ p: "acme/generated/server/main.ts", k: "generated", n: "The server is a generated application. It wires every handler in implementation/ to its route by path, so nobody writes or edits it.", c:
`// Generated from the blueprint. Do not edit.
import { Server } from "@acme/api/server"
import * as Handlers from "../../implementation/handlers"   // one import per handler file, by path
import { Services } from "../../implementation/services"

export default Server.make({ handlers: Handlers, services: Services })` },
{ p: "acme/generated/api/src/invitation/accept.ts", k: "generated", n: "The contract: route, payload and answer schemas, the exact error union, the role check, a span per declared step. The server implements it; the SDK calls it.", c:
`// Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit.
import { HttpApiEndpoint, Schema } from "effect/unstable/httpapi"
import { InvitationNotFound, InvitationNotPending } from "../errors"
import { NotAllowed } from "@architect/blueprint/errors"

export const accept = HttpApiEndpoint.post("invitation.accept", "/invitation/accept")
  .setPayload(Schema.Struct({ invitation: InvitationId }))
  .addSuccess(Schema.Struct({ organization: OrganizationId, role: Schema.Literal("owner", "member") }))
  .addError(InvitationNotFound)       // exit 41
  .addError(InvitationNotPending)     // exit 40, from the machine
  .addError(NotAllowed)               // exit 3, from allowed: [invitee]

export const steps = ["invitation.accept.read", "invitation.accept.join"] as const
export const budget = { p95Ms: 300 } as const` },
{ p: "acme/generated/api/src/index.ts", k: "generated", n: "One group per thing, one endpoint per operation.", c:
`// Generated from the blueprint. Do not edit.
export * as system from "./system"
export * as session from "./session"
export * as person from "./person"
export * as organization from "./organization"
export * as membership from "./membership"
export * as invitation from "./invitation"
export * as apiKey from "./api-key"
export { Api } from "./api"           // the whole HttpApi, for the server and the SDK` },
{ p: "acme/generated/sdk/src/invitation/accept.ts", k: "generated", n: "Built on the API. Every call is an Effect, typed with its payload, answer and exact errors, and traced.", c:
`// Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit.
import { Effect } from "effect"
import { Client } from "../client"
import type { InvitationNotFound, InvitationNotPending, NotAllowed } from "@acme/api/errors"

export const accept = (payload: { readonly invitation: InvitationId }): Effect.Effect<
  { readonly organization: OrganizationId; readonly role: "owner" | "member" },
  InvitationNotFound | InvitationNotPending | NotAllowed,
  Client
> => Client.call("invitation.accept", payload)` },
{ p: "acme/generated/sdk/src/index.ts", k: "generated", n: "How the SDK is used: an Effect service pointed at an environment by a layer.", c:
`// Generated from the blueprint. Do not edit.
//
//   const acme = yield* Acme
//   const { role } = yield* acme.invitation.accept({ invitation })
//
//   program.pipe(Effect.provide(Acme.layer({ environment: "staging" })))
export { Acme } from "./acme"
export * from "./client"` },
{ p: "acme/generated/cli/src/invitation/accept.ts", k: "generated", n: "Built on the SDK. One flag per payload field, readable or JSON output, the error's own exit code, help text from the declaration.", c:
`// Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit.
import { Command, Flag } from "effect/unstable/cli"
import { Acme } from "@acme/sdk"

export const accept = Command.make("accept", {
  invitation: Flag.string("invitation").pipe(Flag.withDescription("The invitation to accept (inv_...).")),
}).pipe(
  Command.withDescription("Accept an invitation and become a member."),
  Command.withHandler(({ invitation }) => Acme.invitation.accept({ invitation })),
)
// $ acme invitation accept --invitation inv_123
// organization  org_456
// role          member
// $ acme invitation accept --invitation inv_123 --json
// {"error":"InvitationNotPending","state":"accepted"}        (exit 40)` },
{ p: "acme/generated/cli/src/main.ts", k: "generated", n: "The CLI's root. login, logout and use come from Architect's library, through Better Auth's device flow.", c:
`// Generated from the blueprint. Do not edit.
import { Cli } from "@architect/blueprint/cli"
import * as Commands from "./commands"

export default Cli.make("acme", {
  commands: Commands,                 // acme <thing> <verb>
  builtIn: ["login", "logout", "use"],// acme login  ·  acme use staging
})` },
{ p: "acme/generated/docs/invitation/accept.md", k: "generated", n: "The operation's docs page, which the portal shows with its live proof beside it.", c:
`<!-- Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit. -->
# invitation.accept

Accept an invitation and become a member.

| | |
|---|---|
| Thing | invitation |
| Move | pending → accepted, emits InvitationAccepted |
| Who may call | invitee (the invitation's email) |
| Payload | invitation |
| Answer | organization, role |
| Errors | InvitationNotFound (41), InvitationNotPending (40), NotAllowed (3) |
| Steps | invitation.accept.read, invitation.accept.join |
| Budget | p95 300 ms |
| Journeys | invite and accept |

SDK: acme.invitation.accept({ invitation })
CLI: acme invitation accept --invitation <id>` },
{ p: "acme/generated/infra/src/test.ts", k: "generated", n: "The Alchemy stack for the test environment, from environments/test.ts. One world per pull request, destroyed as one unit.", c:
`// Generated from blueprint/environments/test.ts. Do not edit.
import { Stack } from "alchemy"
import { Worker } from "@alchemy.run/cloudflare"
import { Branch } from "@alchemy.run/neon"

export default Stack.make("acme-test", { owner: Stack.owner, expires: "2 hours" }, () => ({
  database: Branch("acme-test-db", { project: "acme" }),
  server: Worker("acme-test-server", { entry: "generated/server/main.ts" }),
  logbook: Stack.ref("acme-logbook"),        // verdicts and the blueprint's model
}))` },
{ p: "acme/generated/model/model.json", k: "generated", n: "The compiled blueprint. CI publishes it to the logbook on every push that passes check; the portal and agents read it from there.", c:
`{
  "project": "acme",
  "revision": "9f3c2e1",
  "hash": "sha256:4b1a...e07",
  "things": ["system", "session", "person", "organization", "membership", "invitation", "api-key"],
  "operations": [
    { "name": "invitation.accept", "hash": "sha256:91d0...aa2", "move": "accept",
      "errors": ["InvitationNotFound", "InvitationNotPending", "NotAllowed"], "allowed": ["invitee"],
      "steps": ["invitation.accept.read", "invitation.accept.join"], "budget": { "p95Ms": 300 } }
  ],
  "journeys": [{ "name": "invite and accept", "uses": ["invitation.send", "invitation.accept", "organization.show"] }],
  "edges": [
    { "from": "invitation.accept", "to": "thing:invitation", "kind": "acts-on" },
    { "from": "journey:invite and accept", "to": "invitation.accept", "kind": "proves" }
  ]
}` },
{ p: "acme/generated/portal/README.md", k: "generated", n: "The portal is supplied by Architect and configured, never written. It reads the logbook and updates itself.", c:
`# Generated from the blueprint. Do not edit.
The blueprint's portal (HeroUI), built from @architect/portal and pointed at this project's logbook.
nx serve portal` },
{ p: "acme/.github/workflows/architect.yml", k: "generated", n: "CI, generated: check on every pull request, prove in a fresh test world, publish the model and verdicts with GitHub's OIDC token.", c:
`# Generated from the blueprint. Do not edit.
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - run: pnpm nx run-many -t generate check     # types, rules, drift, ratchets
      - run: pnpm architect publish --model          # the compiled model, to the logbook
  prove:
    needs: check
    steps:
      - run: pnpm architect prove --environment test # a fresh world, every journey, every eval
      - run: pnpm architect publish --verdicts` },

/* ===== architect: the framework ===== */
{ p: "architect/packages/architect/src/index.ts", k: "framework", n: "The library's one entry: everything a blueprint is written with.", c:
`export * as Blueprint from "./declare"      // thing, operation, machine, event, error, role, journey, environment, startingWorld
export * as Auth from "./auth"              // betterAuth()
export * as Cloud from "./cloud"            // cloudflare(), neon()
export * as Identity from "./identity"      // testPrincipals, betterAuth
export * as Telemetry from "./telemetry"    // otlp()
export { Schema } from "effect"
export { expect, refuses } from "./prove/expect"` },
{ p: "architect/packages/architect/src/declare/operation.ts", k: "framework", n: "What an operation declaration may say. The name is never an argument: the compiler reads it from the file's path.", c:
`export interface OperationDeclaration<T extends Thing> {
  readonly description: string
  readonly payload: Fields
  readonly answer: Fields
  readonly move?: Move<T>            // a move of T's machine: start or change its state, emit its event
  readonly errors?: ReadonlyArray<ErrorClass>
  readonly allowed: ReadonlyArray<Role>
  readonly steps?: ReadonlyArray<Step>
  readonly budget: Budget
  readonly evals?: ReadonlyArray<Eval> // extra, per-operation evals; the built-in ones always run
}

export const operation = <T extends Thing>(thing: T, declaration: OperationDeclaration<T>) => /* ... */` },
{ p: "architect/packages/architect/src/model/compile.ts", k: "framework", n: "Reads every declaration by its path, builds the model and its dependency edges, and hashes each operation.", c:
`export const compile = Effect.fn("architect.compile")(function* (root: string) {
  const things = yield* Layout.things(root)                // blueprint/things/<thing>/
  const operations = yield* Layout.operations(things)      // .../verbs/<verb>.ts  ->  "<thing>.<verb>"
  const journeys = yield* Layout.journeys(root)
  const edges = Graph.edges({ things, operations, journeys })
  return Model.make({ things, operations, journeys, edges, hash: Hash.of(...) })
})` },
{ p: "architect/packages/architect/src/prove/evals/machine-path.ts", k: "framework", n: "One of the built-in evals. Each is a pure function over a run's evidence and the model.", c:
`// Every thing's events must form a path through its machine.
export const machinePath = Eval.builtIn("machine-path", (run, model) =>
  run.things.map((thing) => {
    const machine = model.machine(thing.kind)
    const path = thing.events.map((event) => machine.moveFor(event))
    return Eval.result(path.every((move, i) => move.from.includes(path[i - 1]?.to ?? machine.start)),
      { thing: thing.id, path })
  }))` },
{ p: "architect/packages/architect/src/prove/evals/index.ts", k: "framework", n: "The built-in evals every operation gets from its declaration.", c:
`export const builtIn = [
  answerShape,      // the answer decodes with its declared schema
  declaredErrors,   // only declared errors, each with its exit code
  machinePath,      // moves start from allowed states; events form a path
  events,           // each move emits its declared event, with what it declares
  whoMayCall,       // a caller without the role gets NotAllowed
  steps,            // a span per declared step whose path ran; a deciding log per refusal
  performance,      // p50 and p95 against the budget; over 1.5x raises a review, never fails
  coverage,         // every declared move, error and outcome reached by a journey
  explainability,   // the share of each call's time its declared steps account for
] as const` },
{ p: "architect/packages/generators/generators.json", k: "framework", n: "Architect's Nx plugin: the generators you run, and the sync generators Nx runs before every task.", c:
`{
  "generators": {
    "preset":     { "factory": "./src/generators/preset",     "description": "A new project: the full layout and the starter" },
    "thing":      { "factory": "./src/generators/thing",      "description": "architect add thing <thing>" },
    "operation":  { "factory": "./src/generators/operation",  "description": "architect add operation <thing>.<verb>" },
    "journey":    { "factory": "./src/generators/journey",    "description": "architect add journey <name>" },
    "environment":{ "factory": "./src/generators/environment","description": "architect add environment <name>" }
  },
  "syncGenerators": ["./src/sync/model", "./src/sync/api", "./src/sync/sdk", "./src/sync/cli", "./src/sync/docs", "./src/sync/infra"]
}` },
{ p: "architect/packages/generators/src/generators/operation/index.ts", k: "framework", n: "The operation generator: writes the declaration with blanks, at the path derived from the name. The handler is scaffolded later, once the declaration has no blanks left.", c:
`export default async function operation(tree: Tree, options: { name: string }) {
  const { thing, verb } = Names.operation(options.name)          // "invitation.accept"
  generateFiles(tree, join(__dirname, "files/declaration"), \`blueprint/things/\${thing}/verbs\`, { verb, thing })
  await formatFiles(tree)
  // Nx's sync generators then rewrite generated/ before the next task.
}` },
{ p: "architect/packages/generators/src/sync/sdk.ts", k: "framework", n: "A sync generator: keeps generated/sdk equal to what the model says. 'nx sync:check' fails in CI if it isn't.", c:
`export default async function sdk(tree: Tree) {
  const model = await Model.read(tree)
  for (const operation of model.operations) {
    tree.write(Paths.sdk(operation), Templates.sdkCall(operation))   // generated/sdk/src/<thing>/<verb>.ts
  }
  tree.write("generated/sdk/src/index.ts", Templates.sdkIndex(model))
  return { outOfSyncMessage: "generated/sdk is out of date with the blueprint" }
}` },
{ p: "architect/packages/lint/src/rules/handler-matches-path.ts", k: "framework", n: "A generated-rule example: what types can't catch, an oxlint rule does. Each rule says which file to fix.", c:
`// A handler file must sit at implementation/handlers/<thing>/<verb>.ts for a declared operation <thing>.<verb>,
// and must implement exactly that operation.
export const handlerMatchesPath = Rule.make("architect/handler-matches-path", (context) => ({
  ExportDefaultDeclaration(node) {
    const expected = Paths.operationFromHandler(context.filename)
    if (!context.model.has(expected)) context.report(node, \`No operation \${expected}: add it with architect add operation \${expected}\`)
  },
}))` },
{ p: "architect/packages/logbook/src/blueprint-index.ts", k: "framework", n: "The logbook's Durable Object: one per project. See the separate page on durable state for the whole flow.", c:
`export class BlueprintIndex extends DurableObject {
  // SQLite tables: revisions, heads, operations, edges, verdicts, asks
  publish(input: { branch: string; revision: string; model: Model }) { /* store, move the head, mark stale, notify */ }
  operation(branch: string, name: string) { /* the operation with its journeys and verdicts */ }
  dependents(branch: string, node: string) { /* everything that depends on node */ }
}` },
{ p: "architect/packages/portal/README.md", k: "framework", n: "The portal app every project gets.", c:
`# @architect/portal
A HeroUI app that reads a project's logbook. Pages: things, operations (docs + proof), machines (walk the events),
journeys, evals, staleness, ratchets, asks. Read only, except answering an ask.` },
{ p: "architect/examples/acme/README.md", k: "framework", n: "The starter, generated by the preset and checked in as Architect's own proof: it must pass check and prove on every change to Architect.", c:
`# examples/acme
Generated by: npx create-nx-workspace acme --preset=@architect/preset
Every change to Architect regenerates this and runs check and prove on it.` },
];

