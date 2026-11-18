import { loadActionsFromStaticRegistry } from "@agent-native/core/server";
import action from "../app/actions/proposal-vote.ts";
const mod = { default: action };
console.log("defineAction result .errorCodes:", JSON.stringify((action as any).errorCodes));
console.log("after static registry .errorCodes:", JSON.stringify((loadActionsFromStaticRegistry({ v: mod }) as any).v.errorCodes));
