import { Blueprint } from "@architect/blueprint";
export const Audit = Blueprint.thing({description:"Graph-only metadata control.", fields:{id:Blueprint.id("audit")}, code:"QA"});
export class EchoProblem extends Blueprint.error({}, {exit:79}) {}
