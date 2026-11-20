import type { CellId, Eval } from "../../grid/types.ts";
import type { JourneyModel, ProjectEvidence } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

const journeyOf = (e: ProjectEvidence, subject: string): JourneyModel | undefined => Object.values(e.model.journeys ?? {}).find((j) => j.name === subject);
const over = (cell: CellId, problems: (journey: JourneyModel, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "journey", journeyOf, problems);

/** The steps that run: a step whose operation is outside the model is skipped and runs nothing. */
const running = (journey: JourneyModel) => journey.steps.filter((s) => s.skipped === undefined);
/** The operations a journey calls in its own steps. */
const calls = (journey: JourneyModel): ReadonlyArray<string> => [...new Set(running(journey).flatMap((s) => (s.call === undefined ? [] : [s.call.operation])))];

/** journey.model: the journey is in the model with a cast, a start that exists and steps that call real operations, and prove ran every one green. */
export const model = over("journey.model", (journey, e) => {
  const ran = e.prove?.journeys.find((j) => j.name === journey.name);
  return [
    ...(running(journey).length === 0 ? ["it has no steps that run"] : []),
    ...(journey.cast === undefined || Object.keys(journey.cast).length === 0 ? ["it has no cast"] : []),
    ...(journey.starts != null && e.model.startingWorlds?.[journey.starts] === undefined ? [`it starts in ${journey.starts}, which the model has no starting world for`] : []),
    ...calls(journey).filter((op) => e.model.operations[op] === undefined).map((op) => `a step calls ${op}, which the model does not have`),
    ...(e.prove === undefined ? ["no prove run was read, so the journey was not seen to run"]
      : ran === undefined ? [`prove's report has no journey ${journey.name}`]
      : [
        ...(ran.verdict === "pass" ? [] : [`prove reports the journey ${ran.verdict}`]),
        ...(ran.steps.length === running(journey).length ? [] : [`prove ran ${ran.steps.length} of its ${running(journey).length} steps`]),
        ...ran.steps.filter((s) => s.verdict !== "pass").map((s) => `step "${s.name}" is ${s.verdict}`),
      ]),
  ];
});

/**
 * journey.server: the deployed server serves no journey: nothing it was generated from names this one. (That `/_world/*` answers only in an
 * environment that declares a lifetime is not judged here: it needs the server run in one that does not, which waits for `prove --through`.)
 */
export const server = over("journey.server", (journey, e) =>
  Object.entries(e.files).filter(([path, text]) => path.startsWith("generated/server/") && text.includes(journey.name)).map(([path]) => `${path} names "${journey.name}": the server carries a journey`));

/** journey.docs: each operation the journey calls lists it, as a worked example, on its page. */
export const docs = over("journey.docs", (journey, e) => calls(journey).flatMap((op) => {
  const model = e.model.operations[op];
  const path = model === undefined ? "" : `generated/docs/${model.thing}/${model.verb}.md`;
  return (e.files[path] ?? "").includes(journey.name) ? [] : [`${path || op}'s page does not list the journey "${journey.name}" as a worked example`];
}));

/** journey.portal: each operation the journey calls shows it, in the portal's own part of its page (the proof tab), not in the docs it embeds. */
export const portal = over("journey.portal", (journey, e) => calls(journey).flatMap((op) => {
  const route = `/portal/operations/${op}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  return Reading.htmlText(Reading.portalOwn(page)).includes(journey.name) ? [] : [`${route} shows no proof from the journey "${journey.name}"`];
}));

/** journey.telemetry: each step the journey ran is a span under the journey's name, carrying `journey` and `journey.step`. */
export const telemetry = over("journey.telemetry", (journey, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = Reading.spansNamed(e.spans, `journey.${journey.name}`);
  const steps = new Set(spans.map((s) => String(s.attrs["journey.step"])));
  return [
    ...(spans.length === 0 ? [`no span named journey.${journey.name}`] : []),
    ...spans.filter((s) => s.attrs["journey"] !== journey.name).slice(0, 1).map((s) => `a journey.${journey.name} span has journey ${String(s.attrs["journey"] ?? "none")}`),
    ...(spans.length > 0 && steps.size < running(journey).length ? [`its spans cover ${steps.size} distinct steps, the journey ran ${running(journey).length}`] : []),
  ];
});
