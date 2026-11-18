import { Blueprint } from "orthograph";
import { Milestone } from "./thing.ts";

export const MilestoneAdded = Blueprint.event({ milestone: Milestone.fields.id, mission: Milestone.fields.mission, kinds: Milestone.fields.kinds, of: Milestone.fields.of, until: Milestone.fields.until });
export const MilestoneDropped = Blueprint.event({ milestone: Milestone.fields.id });
