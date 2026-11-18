// @orthograph/logbook: verdicts and the model, kept per project (D3 #3, #8). The worker itself is `main.ts`, bundled by wrangler;
// what other packages import is how to run it (`Logbook`) and the shapes it answers with.
export { Logbook } from "#modules/local/service.js";
export type { Launch, LaunchOptions, LogbookApi, LogbookPolicy, Running } from "#modules/local/types.js";
export { LogbookFailed } from "#modules/local/types.js";
export type { Release, StoredVerdict, VerdictFilter, VerdictInput, VerdictValue } from "#modules/book/types.js";
