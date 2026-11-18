import { defineAction } from "@agent-native/core/action";
import { options } from "../../src/generated/proposal-vote.ts";
import { host } from "./_host.ts";
export default defineAction(options(host));
