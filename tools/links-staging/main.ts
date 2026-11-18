import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const app = resolve("examples/links");
const generated = resolve(app, "generated/server");
const worker = "orthograph-links-staging";
const link = { title: "Staging smoke test", url: "https://example.com" };

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const configure = (output: string, databaseId: string) => {
  assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(databaseId), "Expected the staging D1 UUID");
  const source = resolve(generated, "wrangler.jsonc");
  const { config, error } = ts.parseConfigFileTextToJson(source, readFileSync(source, "utf8"));
  assert(!error && config.d1_databases?.length === 1 && config.d1_databases[0].binding === "DB", "The generated Worker configuration changed");
  writeFileSync(output, JSON.stringify({
    ...config,
    name: worker,
    main: resolve(generated, config.main),
    workers_dev: true,
    preview_urls: false,
    d1_databases: [{
      ...config.d1_databases[0],
      database_name: worker,
      database_id: databaseId,
      migrations_dir: resolve(generated, config.d1_databases[0].migrations_dir),
    }],
    vars: { ...config.vars, ORTHO_ENVIRONMENT: "staging" },
  }));
};

const stagingUrl = (address: string) => {
  const base = new URL(address);
  assert(
    base.protocol === "https:" && /^orthograph-links-staging\.[a-z0-9-]+\.workers\.dev$/.test(base.hostname)
      && base.origin === base.href.slice(0, -1),
    "Expected the dedicated Links staging Workers URL",
  );
  return base;
};

const smoke = async (address: string) => {
  const base = stagingUrl(address);
  const call = (path: string, payload: object) =>
    fetch(new URL(path, base), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000), redirect: "error",
    });
  const world = await fetch(new URL("/_world/health", base), { signal: AbortSignal.timeout(15_000), redirect: "error" });
  assert(world.status === 404, "Staging exposed its local test-world route");

  const suffix = randomBytes(8).toString("hex");
  const name = `staging${suffix}`;
  const credentials = { email: `${name}@example.com`, password: randomBytes(24).toString("hex") };
  const signup = await call("/person/sign-up", { ...credentials, name: "Links staging check" });
  assert(signup.ok, `Staging sign-up returned HTTP ${signup.status}`);
  const signIn = await call("/session/sign-in", credentials);
  assert(signIn.ok, `Staging sign-in returned HTTP ${signIn.status}`);
  const { token } = await signIn.json() as { token?: string };
  assert(token, "Staging sign-in did not issue a session");

  const cli = (authenticated: boolean, ...args: string[]) => spawnSync(
    process.execPath, [resolve(generated, "../cli/src/main.ts"), ...args],
    { encoding: "utf8", timeout: 30_000, env: { PATH: process.env.PATH, LINKS_URL: base.origin, ...(authenticated ? { LINKS_TOKEN: token } : {}) } },
  );
  const claimed = cli(true, "handle", "claim", "--name", name, "--json");
  assert(claimed.status === 0, "The generated CLI could not claim a staging handle");
  const { handle } = JSON.parse(claimed.stdout) as { handle: string };
  try {
    const duplicate = cli(true, "handle", "claim", "--name", name);
    assert(duplicate.status === 3 && duplicate.stderr.includes("[HN-001] HandleTaken"), "The second staging claim did not return HN-001 with exit 3");
    const added = cli(true, "link", "add", "--title", link.title, "--url", link.url, "--json");
    assert(added.status === 0, "The generated CLI could not add the staging link");
    const { link: id } = JSON.parse(added.stdout) as { link: string };
    try {
      const read = cli(false, "profile", "get", "--handle", name, "--json");
      assert(read.status === 0, "An anonymous visitor could not read the staging page");
      const page = JSON.parse(read.stdout) as { handle: string; links: Array<{ id: string } & typeof link> };
      assert(page.handle === name && page.links.length === 1 && page.links[0]?.id === id
        && page.links[0].title === link.title && page.links[0].url === link.url, "The staging page did not return the link that was added");
    } finally {
      assert(cli(true, "link", "remove", "--link", id).status === 0, "Could not remove the smoke-test link");
    }
  } finally {
    assert(cli(true, "handle", "release", "--handle", handle).status === 0, "Could not release the smoke-test handle");
  }
  console.log("Hosted Links passed sign-up, sign-in, claim, duplicate refusal, link add, and anonymous profile read.");
};

const [command, first, second] = process.argv.slice(2);
if (command === "configure" && first && second) configure(first, second);
else if (command === "smoke" && first) await smoke(first);
else throw new Error("Usage: main.ts configure <output> <database-id> | smoke <staging-url>");
