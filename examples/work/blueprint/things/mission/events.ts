import { Blueprint } from "orthograph";
import { Mission } from "./thing.ts";
import { Note } from "../../values/work.ts";

export const MissionOpened = Blueprint.event({ mission: Mission.fields.id, title: Mission.fields.title, target: Mission.fields.target, blueprint: Mission.fields.blueprint });
export const MissionStarted = Blueprint.event({ mission: Mission.fields.id });
export const MissionPaused = Blueprint.event({ mission: Mission.fields.id, why: Note });
export const MissionResumed = Blueprint.event({ mission: Mission.fields.id });
export const MissionFinished = Blueprint.event({ mission: Mission.fields.id });
export const MissionStopped = Blueprint.event({ mission: Mission.fields.id, why: Note });
