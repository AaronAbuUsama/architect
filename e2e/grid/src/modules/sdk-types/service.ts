import ts from "typescript";
import { allowsUndefined, exactStates, exportedType, kindOf, kindProblem, stateTypeNames } from "./internal/judge.ts";
import { programOf, virtualPath } from "./internal/program.ts";
import type { SdkTypesApi } from "./types.ts";

export const SdkTypes: SdkTypesApi = {
  fieldProblems: ({ files, model, thing, path }) => {
    const b = programOf(files, model);
    const declared = exportedType(b, path, thing.identifier);
    const at = `${path}'s ${thing.identifier}`;
    if (declared === undefined) return [`${at} cannot be resolved`];
    const file = b.program.getSourceFile(virtualPath(path))!;
    return [
      ...(b.checker.getIndexInfosOfType(declared).length > 0 ? [`${at} has an index signature, so it takes any field`] : []),
      ...Object.entries(thing.fields).flatMap(([name, field]) => {
        if (name === "state" && thing.machine != null) return [];
        const property = declared.getProperty(name);
        if (property === undefined) return [`${at} leaves out the field ${name}`];
        const type = b.checker.getTypeOfSymbolAtLocation(property, property.valueDeclaration ?? file);
        const absent = (property.flags & ts.SymbolFlags.Optional) !== 0 || allowsUndefined(type);
        const required = field.visibility === undefined && field.optional !== true;
        const wrong = kindProblem(b, kindOf(field.value.type), type, `${thing.name}.${name}`);
        return wrong !== undefined ? [`${at}.${name} ${wrong}`]
          : required && absent ? [`${at}.${name} is optional or may be undefined, but every call carries it`]
          : !required && !absent ? [`${at}.${name} is not optional, but the model says a call may leave it out`]
          : [];
      }),
    ];
  },

  stateProblems: ({ files, model, thing, path, states }) => {
    const b = programOf(files, model);
    const declared = exportedType(b, path, thing.identifier);
    const at = `${path}'s ${thing.identifier}`;
    const member = declared?.getProperty("state");
    const file = b.program.getSourceFile(virtualPath(path));
    const memberType = member === undefined || file === undefined ? undefined : b.checker.getTypeOfSymbolAtLocation(member, member.valueDeclaration ?? file);
    return [
      ...(declared === undefined ? [`${at} cannot be resolved`] : memberType === undefined ? [`${at} has no state member: a caller's state is not typed`] : (([wrong]) => (wrong === undefined ? [] : [`${at}.state ${wrong}`]))([exactStates(b, memberType, states)])),
      ...stateTypeNames(b, thing.identifier).flatMap(({ path: where, name }) => {
        const type = exportedType(b, where, name);
        const wrong = type === undefined ? undefined : exactStates(b, type, states);
        return wrong === undefined ? [] : [`${where}'s ${name} ${wrong}`];
      }),
    ];
  },
};
