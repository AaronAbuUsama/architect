// Check 4 (D3 #15.4, walkthrough step 11): production refuses a revision with no staging verdicts, then takes the one staging
// proved, running the same bundle hash; the first release is 1.0.0, the release after the read is 1.1.0.
//
// Chosen where D3 #14 is open:
// - `promote --to production` refuses with `refused: <rev> has no green verdicts in staging`, exit 1, on stdout or stderr.
// - `promote` deploys to an environment that is up (`env up staging`, `env up production`), restarting it on the new bundle with
//   its state kept; `promote --to staging` also posts staging's verdicts; `promote --to production` also publishes the release.
// - Each environment's worker reports its bundle: `GET <env url>/_architect/bundle` answers `{ "revision", "sha256" }`, the
//   sha256 being the bare hex of `.architect/artefacts/<rev>/main.js`.
// - With a registry in ARCHITECT_REGISTRY, staging publishes `@acme/sdk@<next>-next.<n>` under the dist-tag `next` and
//   production publishes `@acme/sdk@<next>` under `latest`. With no ARCHITECT_TAP_REPO the Homebrew step is skipped.
// - Destinations the local pass can't reach print `skipped <destination> (cloud pass)` (the GitHub release, at least, in
//   a production promote).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addList, build, promote, proveInTest } from "./flow.ts";
import { type Stack, finish, startStack } from "./services.ts";
import { commit, getJson, project, run } from "./support.ts";

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 4, { registry: true }); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { copy.remove(); } });

type Packument = { "dist-tags": Record<string, string> };
const sdk = (registry: string) => getJson<Packument>(`${registry}@acme%2fsdk`);
const bundle = (url: string) => getJson<{ revision: string; sha256: string }>(`${url}/_architect/bundle`);

describe("check 4: promote", () => {
  it("production refuses an unproven revision, takes the staging-proven one with the same bundle, and releases 1.0.0 then 1.1.0", async () => {
    const s = stack!;
    const { root } = copy;
    const first = build(root, s, copy.rev);
    expect(build(root, s, copy.rev).hash, "two builds of one revision").toBe(first.hash);
    s.up("test");
    s.up("staging");
    s.up("production");
    proveInTest(root, s);

    // Nothing proved in staging yet.
    const refused = promote(root, s, "production");
    expect(refused.status, refused.out).toBe(1);
    expect(refused.lines, refused.out).toContain(`refused: ${copy.rev} has no green verdicts in staging`);

    // Test has passed, staging has not yet been promoted to.
    const staged = promote(root, s, "staging");
    expect(staged.status, staged.out.slice(-3000)).toBe(0);
    expect(await bundle(s.url("staging"))).toEqual({ revision: copy.rev, sha256: first.hash });
    expect((await sdk(s.registry!))["dist-tags"]["next"]).toMatch(/^1\.0\.0-next\.\d+$/);

    const released = promote(root, s, "production");
    expect(released.status, released.out.slice(-3000)).toBe(0);
    expect(released.lines, released.out).toContain(`production from staging ${copy.rev} sha256:${first.hash}`);
    expect(released.lines.some((l) => /^skipped .+ \(cloud pass\)$/.test(l)), released.out).toBe(true);
    expect(await bundle(s.url("production"))).toEqual({ revision: copy.rev, sha256: first.hash });
    expect((await sdk(s.registry!))["dist-tags"]["latest"], "the first release").toBe("1.0.0");

    // A new revision, with the read: unproven in staging, so production refuses it again.
    addList(root, s);
    const second = commit(root, "allowance.list");
    expect(run(root, s.env, "version", "--next").stdout.trim()).toBe("1.1.0");
    const next = build(root, s, second);
    expect(next.hash).not.toBe(first.hash);
    const again = promote(root, s, "production");
    expect(again.status, again.out).toBe(1);
    expect(again.lines, again.out).toContain(`refused: ${second} has no green verdicts in staging`);

    proveInTest(root, s);
    expect(promote(root, s, "staging").status).toBe(0);
    expect(await bundle(s.url("staging"))).toEqual({ revision: second, sha256: next.hash });
    const after = promote(root, s, "production");
    expect(after.status, after.out.slice(-3000)).toBe(0);
    expect(after.lines, after.out).toContain(`production from staging ${second} sha256:${next.hash}`);
    expect(await bundle(s.url("production"))).toEqual({ revision: second, sha256: next.hash });
    expect((await sdk(s.registry!))["dist-tags"]["latest"], "the release after the read").toBe("1.1.0");
  });
});
