// @architect/blueprint: the declaration language projects import. `import { Blueprint } from "@architect/blueprint"`.
import { Blanks } from "#modules/blanks/service.js";
import { Errors } from "#modules/errors/service.js";
import { Events } from "#modules/events/service.js";
import { Checks, Journeys } from "#modules/journeys/service.js";
import { NotAllowed } from "#modules/errors/types.js";
import { Machines } from "#modules/machines/service.js";
import { Operations } from "#modules/operations/service.js";
import { Roles } from "#modules/roles/service.js";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";

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
export { NotAllowed } from "#modules/errors/types.js";
export type { Value, TypeOf } from "#modules/values/types.js";
export type { Thing, Field, FieldsInput, Lives } from "#modules/things/types.js";
export type { Event } from "#modules/events/types.js";
export type { BlueprintError, ErrorClass, AnyErrorClass } from "#modules/errors/types.js";
export type { Machine, Move, NotFrom } from "#modules/machines/types.js";
export type { Role, RoleOf, Allowed, Principal, InstanceOf } from "#modules/roles/types.js";
export type { Operation, Read, Step, Budget, PayloadOf, AnswerOf, ErrorOf, StepsOf } from "#modules/operations/types.js";
export type { Blank } from "#modules/blanks/types.js";
export type { Journey, StartingWorld, Step as JourneyStep, Call, Assertion, Script, Actor, Ref, Refusal } from "#modules/journeys/types.js";
