import type { OperationModel } from "@architect/compiler";

export const GENERATED = "// Generated from the blueprint. Do not edit.";
export const scaffolded = (from: string) => `// Scaffolded from ${from}. Yours from now on.`;

export const pascal = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
export const camel = (name: string) => pascal(name).replace(/^./, (c) => c.toLowerCase());

/** The variable an operation goes by in generated code: `allowance.grant` is `allowanceGrant`. */
export const opVar = (op: OperationModel) => `${camel(op.thing)}${pascal(op.verb)}`;

/** Climb from a generated file back to the project root. */
export const toRoot = (from: string) => "../".repeat(from.split("/").length - 1);

export const lines = (...parts: ReadonlyArray<string | ReadonlyArray<string>>) => parts.flat().join("\n") + "\n";

/** HTTP status per kind of refusal: a declared data error, a machine in the wrong state, a caller without the role. */
export const STATUS = { declared: 422, notFrom: 409, notAllowed: 403 } as const;
export const NOT_ALLOWED_EXIT = 3;
