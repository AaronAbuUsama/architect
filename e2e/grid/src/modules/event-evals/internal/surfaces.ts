import { Reading } from "../../reading/service.ts";
import { over } from "./over.ts";

/** event.model: the thing declares the event with its fields (each with a value type), and a move of its machine emits it. */
export const model = over("event.model", ({ name, thing, fields, emitters }) => [
  ...Object.entries(fields).filter(([, f]) => typeof f.value?.type !== "string").map(([field]) => `field ${field} has no value type`),
  ...(Object.values(thing.machine?.moves ?? {}).some((m) => m.emits === name) ? [] : [`no move of ${thing.name}'s machine emits ${name}`]),
  ...(emitters.length === 0 ? [`no operation makes a move that emits ${name}`] : []),
]);

/**
 * event.server: each operation that emits it passes prove's `events` check, and its commit span says the event was committed. The journal itself
 * is not read: an event with a secret or private field is red until the journal can be (the cell asks that those fields never reach it).
 */
export const server = over("event.server", ({ name, fields, emitters }, e) => [
  ...emitters.flatMap((op) => Reading.proved(e.prove, `${op.name} events`)),
  ...(e.spans === undefined ? ["no spans were read from the prove run"] : emitters.flatMap((op) =>
    Reading.spansNamed(e.spans ?? [], `${op.name}.commit`).some((s) => s.attrs["event.name"] === name && s.attrs["commit.outcome"] === "committed") ? [] : [`no committed ${op.name}.commit span names ${name}`])),
  ...Object.entries(fields).filter(([, f]) => f.visibility !== undefined).map(([field]) => `${name}.${field} is not public, and nothing reads the journal to show it is left out`),
]);

const lists = (text: string, name: string, fields: ReadonlyArray<string>): ReadonlyArray<string> => {
  const at = text.indexOf(name);
  if (at < 0) return [`does not list ${name}`];
  const near = text.slice(at, at + 400);
  return fields.filter((f) => !new RegExp(`\\b${f}\\b`).test(near)).map((f) => `lists ${name} without its field ${f}`);
};

/** event.docs: the thing's page documents the event with its fields (an Events section; a move table naming it does not document it). */
export const docs = over("event.docs", ({ name, thing, fields }, e) => {
  const path = `generated/docs/${thing.name}/index.md`;
  const page = e.files[path];
  if (page === undefined) return [`${path} was not generated`];
  const section = Reading.mdSection(page, "Events");
  return section === undefined ? [`${path} has no Events section documenting ${name} with its fields`] : lists(section, name, Object.keys(fields)).map((p) => `${path}'s Events ${p}`);
});

/** event.portal: the thing's page lists the event with its fields, in the portal's own part. */
export const portal = over("event.portal", ({ name, thing, fields }, e) => {
  const route = `/portal/things/${thing.name}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  const section = Reading.htmlSection(Reading.portalOwn(page), 2, "Events");
  return section === undefined ? [`${route} has no Events section listing ${name} with its fields`] : lists(Reading.htmlText(section), name, Object.keys(fields)).map((p) => `${route}'s Events ${p}`);
});

/** event.telemetry: the commit span of each operation that emits it carries `event.name`. */
export const telemetry = over("event.telemetry", ({ name, emitters }, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = e.spans;
  return emitters.flatMap((op) => (Reading.spansNamed(spans, `${op.name}.commit`).some((s) => s.attrs["event.name"] === name) ? [] : [`no ${op.name}.commit span carries event.name ${name}`]));
});
