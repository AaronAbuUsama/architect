// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as allowanceGrant from "./allowance/grant.ts";
import * as organizationCreate from "./organization/create.ts";

export class Allowance extends HttpApiGroup.make("allowance").add(allowanceGrant.endpoint) {}
export class Organization extends HttpApiGroup.make("organization").add(organizationCreate.endpoint) {}
export class Api extends HttpApi.make("acme").add(Allowance).add(Organization) {}

export * as Errors from "./errors.ts";
export const operations = { "allowance.grant": allowanceGrant, "organization.create": organizationCreate } as const;
