// `up`: makes what the plan lists, in the order the spike found forced (D1 ids first, then migrations, then the deploy, then the secret), and waits until the address answers.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { StagingFailed, type Credentials, type Plan, type Tools } from "../types.ts";
import { deployConfig, parseGenerated } from "./config.ts";
import { stagingUrl } from "./plan.ts";

/** Wrangler's own error text can hold the account id and, in a bad day, the token: neither is ever repeated. */
const redact = (text: string, c: Credentials) => text.split(c.token).join("[token]").split(c.account).join("[account]");
const tail = (text: string) => text.trim().split("\n").slice(-6).join(" | ").slice(0, 600);

const io = <A>(what: string, work: () => A) => Effect.try({ try: work, catch: () => new StagingFailed({ message: `could not ${what}` }) });

/** A first deploy of a new Worker fails about half the time after it has uploaded (code 10007, spike snag 11); a second, 20 seconds later, succeeded every time. */
const RETRIES = 2;
const RETRY_AFTER = 20_000;
/** A new Worker is not reachable the moment `deploy` returns (snag 10): three good answers in a row, two seconds apart, at most thirty tries. */
const GOOD = 3;
const TRIES = 30;
const BETWEEN = 2_000;

export const up = (tools: Tools, credentials: Credentials, root: string, plan: Plan) =>
  Effect.gen(function* () {
    const account = tools.account(credentials);
    const wrangler = (args: ReadonlyArray<string>, cwd: string, input?: string) => tools.wrangler({ args, cwd, credentials, ...(input === undefined ? {} : { input }) });
    const failure = (what: string, done: { readonly output: string }) => new StagingFailed({ message: `${what} failed: ${tail(redact(done.output, credentials))}` });
    const ran = (what: string, done: { readonly status: number; readonly output: string }) => (done.status === 0 ? Effect.void : Effect.fail(failure(what, done)));

    // Everything that can be refused is refused before anything is made.
    const subdomain = yield* account.subdomain;
    const generatedPath = join(root, "generated/server/wrangler.jsonc");
    const generated = yield* io("read generated/server/wrangler.jsonc: run `ortho generate`", () => readFileSync(generatedPath, "utf8")).pipe(Effect.flatMap(parseGenerated));
    const built = yield* tools.build(root);

    const existing = new Map((yield* account.databases).map((d) => [d.name, d.id]));
    const ids: Record<string, string> = {};
    for (const r of plan.resources.filter((x) => x.kind === "d1")) {
      const name = String(r.name);
      ids[name] = existing.get(name) ?? (yield* account.createDatabase(name));
    }

    const text = yield* deployConfig({ generated, generatedPath, plan, ids, built });
    const config = join(root, ".ortho/staging", plan.prefix, "wrangler.json");
    yield* io("write the staging config", () => { mkdirSync(dirname(config), { recursive: true }); writeFileSync(config, text); });
    const serverDir = dirname(generatedPath);

    for (const r of plan.resources.filter((x) => x.kind === "d1")) {
      yield* wrangler(["d1", "migrations", "apply", String(r.name), "--remote", "--config", config], serverDir).pipe(Effect.flatMap((done) => ran(`applying the migrations of ${r.name}`, done)));
    }

    for (let attempt = 1; ; attempt++) {
      const done = yield* wrangler(["deploy", "--config", config], serverDir);
      if (done.status === 0) break;
      if (attempt >= RETRIES || !done.output.includes("10007")) return yield* failure("the deploy", done);
      yield* tools.pause(RETRY_AFTER);
    }

    yield* wrangler(["secret", "put", "AUTH_SECRET", "--config", config], serverDir, `${tools.secret()}\n`).pipe(Effect.flatMap((done) => ran("setting the Worker's secret", done)));

    const url = stagingUrl(plan.prefix, subdomain);
    let good = 0;
    for (let tried = 0; tried < TRIES && good < GOOD; tried++) {
      if (tried > 0) yield* tools.pause(BETWEEN);
      good = (yield* tools.probe(`${url}/_ortho/bundle`)) === 200 ? good + 1 : 0;
    }
    if (good < GOOD) return yield* new StagingFailed({ message: `the Worker at ${url} did not answer ${GOOD} times running; \`ortho env destroy staging --run ${plan.run}\` removes it` });
    return url;
  });
