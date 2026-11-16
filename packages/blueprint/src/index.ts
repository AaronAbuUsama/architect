// @architect/blueprint: the declaration language projects import. `import { Blueprint } from "@architect/blueprint"`.
import { Blanks } from "#modules/blanks/service.ts";
import { Errors } from "#modules/errors/service.ts";
import { Events } from "#modules/events/service.ts";
import { Checks, Journeys } from "#modules/journeys/service.ts";
import { NotAllowed } from "#modules/errors/types.ts";
import { Machines } from "#modules/machines/service.ts";
import { Operations } from "#modules/operations/service.ts";
import { Roles } from "#modules/roles/service.ts";
import { Things } from "#modules/things/service.ts";
import { Values } from "#modules/values/service.ts";

export const Blueprint = Object.freeze({
  ...Values,
  ...Things,
  ...Events,
  ...Errors,
  ...Machines,
  ...Roles,
  ...Operations,
  ...Journeys,
  NotAllowed,
  todo: Blanks.todo,
});

export { Schema } from "effect";
export const { expect, emits, noEvents, refuses, spans } = Checks;
export { NotAllowed } from "#modules/errors/types.ts";
export type { Value, TypeOf } from "#modules/values/types.ts";
export type { Thing, Field, FieldsInput } from "#modules/things/types.ts";
export type { Event } from "#modules/events/types.ts";
export type { BlueprintError, ErrorClass, AnyErrorClass } from "#modules/errors/types.ts";
export type { Machine, Move, NotFrom } from "#modules/machines/types.ts";
export type { Role, RoleOf, Allowed, Principal, InstanceOf } from "#modules/roles/types.ts";
export type { Operation, Read, Step, Budget, PayloadOf, AnswerOf, ErrorOf, StepsOf } from "#modules/operations/types.ts";
export type { Blank } from "#modules/blanks/types.ts";
export type { Journey, StartingWorld, Step as JourneyStep, Call, Assertion, Script, Actor, Ref } from "#modules/journeys/types.ts";
