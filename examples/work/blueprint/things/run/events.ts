import { Blueprint } from "@formants/forman";
import { Run } from "./thing.ts";
import { Branch, Note, Report } from "../../values/work.ts";

export const RunStarted = Blueprint.event({ run: Run.fields.id, mission: Run.fields.mission, task: Run.fields.task, agent: Run.fields.agent, model: Run.fields.model });
export const RunReported = Blueprint.event({ run: Run.fields.id, report: Report, note: Note });
export const RunFinished = Blueprint.event({ run: Run.fields.id, branch: Branch });
export const RunFailed = Blueprint.event({ run: Run.fields.id, why: Note });
export const RunStopped = Blueprint.event({ run: Run.fields.id, why: Note });
