// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as allowanceGet from "./allowance/get.ts";
import * as allowanceGrant from "./allowance/grant.ts";
import * as allowanceRevoke from "./allowance/revoke.ts";
import * as allowanceSpend from "./allowance/spend.ts";
import * as organizationCreate from "./organization/create.ts";

export class Allowance extends HttpApiGroup.make("allowance").add(allowanceGet.endpoint).add(allowanceGrant.endpoint).add(allowanceRevoke.endpoint).add(allowanceSpend.endpoint) {}
export class Organization extends HttpApiGroup.make("organization").add(organizationCreate.endpoint) {}
export class Api extends HttpApi.make("acme").add(Allowance).add(Organization) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "allowance.get": allowanceGet, "allowance.grant": allowanceGrant, "allowance.revoke": allowanceRevoke, "allowance.spend": allowanceSpend, "organization.create": organizationCreate } as const;
