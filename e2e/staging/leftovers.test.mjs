// Run by `nx run e2e:test` (node --test): the lister's judging, on the listings the spike recorded (`recorded/`: run 44742578303 of `spikes/staging-pass`, while up and after destroy, the
// account's other resources renamed) and on planted ones. Nothing here touches the cloud: `snapshot` is run against a fake account served from this machine.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { KINDS, leftovers, made, owns, read, untouched, worst } from "./listing.mjs";

const here = import.meta.dirname;
const recorded = (name) => JSON.parse(readFileSync(join(here, "recorded", `${name}.json`), "utf8"));
const P = "ortho-staging-pass-44742578303";
const clean = () => recorded("run-5-after-destroy");
const up = () => recorded("run-5-while-up");
/** A copy of a listing with names added to one kind. */
const plus = (listing, label, ...names) => listing.map((e) => (e.label === label ? { ...e, names: [...e.names, ...names] } : e));
const minus = (listing, label, ...names) => listing.map((e) => (e.label === label ? { ...e, names: e.names.filter((n) => !names.includes(n)) } : e));
const lines = (v) => v.lines.join("\n");

describe("the recorded listings are what the spike's job wrote", () => {
  test("all four kinds, the account's others in each, and none of the run's after destroy", () => {
    assert.deepEqual(clean().map((e) => e.label), KINDS);
    assert.deepEqual(up().map((e) => e.label), KINDS);
    assert.deepEqual(clean().map((e) => e.names.length), [18, 0, 12, 6]);
    assert.deepEqual(up().map((e) => e.names.length), [20, 1, 14, 7]);
  });
});

describe("leftovers: nothing of the run's is left after destroy", () => {
  test("clean: the recorded listing after destroy passes, with the account's 36 other resources still there", () => {
    const v = leftovers(clean(), P);
    assert.equal(v.exit, 0);
    assert.deepEqual(v.left, []);
  });

  test("everything left: the recorded listing while up fails and names all six, one per resource", () => {
    const v = leftovers(up(), P);
    assert.equal(v.exit, 1);
    assert.deepEqual(v.left.map((r) => `${r.label}: ${r.name}`).sort(), [
      `d1: ${P}-db`,
      `durable-object-namespaces: ${P}-plugged-in:World:${P}-plugged-in_World`,
      `durable-object-namespaces: ${P}-sink:Sink:${P}-sink_Sink`,
      `r2: ${P}-bucket`,
      `workers: ${P}-plugged-in`,
      `workers: ${P}-sink`,
    ]);
  });

  // One leftover, of each kind in turn: a verdict that only looked at Workers would pass three of these.
  for (const [label, name] of [
    ["workers", `${P}-worker`],
    ["d1", `${P}-db-ledger`],
    ["durable-object-namespaces", `${P}-worker:Actor:${P}-worker_Actor`],
    ["r2", `${P}-bucket`],
  ]) {
    test(`one leftover, a ${label} entry: fails and names that one and no other`, () => {
      const v = leftovers(plus(clean(), label, name), P);
      assert.equal(v.exit, 1);
      assert.deepEqual(v.left, [{ label, name }]);
      assert.match(lines(v), new RegExp(`LEFTOVER ${label}: `));
    });
  }

  test("one leftover that is not in the first or the last of its list: found wherever it sits", () => {
    const listing = clean().map((e) => (e.label === "workers" ? { ...e, names: [...e.names.slice(0, 9), `${P}-worker`, ...e.names.slice(9)] } : e));
    assert.deepEqual(leftovers(listing, P).left.map((r) => r.name), [`${P}-worker`]);
  });

  test("case and surrounding space do not hide a leftover: a name that differs only there is read as the run's", () => {
    for (const name of [` ${P}-worker`, `${P}-worker `, `${P}-WORKER`.toUpperCase(), `${P.toUpperCase()}-worker`]) {
      const v = leftovers(plus(clean(), "workers", name), P);
      assert.equal(v.exit, 1, JSON.stringify(name));
      assert.deepEqual(v.left.map((r) => r.name), [name]);
    }
  });

  test("a kind that came with names and an error still has its names searched: a leftover among them is a 1, not a 2", () => {
    const listing = clean().map((e) => (e.label === "workers" ? { label: "workers", names: [...e.names, `${P}-worker`], error: "boom" } : e));
    const v = leftovers(listing, P);
    assert.equal(v.exit, 1);
    assert.deepEqual(v.left, [{ label: "workers", name: `${P}-worker` }]);
  });

  test("a leftover found beside a kind that could not be read still fails the run (1, not 2)", () => {
    const listing = plus(clean(), "r2", `${P}-bucket`).map((e) => (e.label === "workers" ? { label: "workers", error: "HTTP 403 []" } : e));
    assert.equal(leftovers(listing, P).exit, 1);
  });
});

describe("leftovers: what is not the run's is not touched or counted", () => {
  const lookalikes = [
    ["workers", `${P}x-worker`, "continues the prefix with no dash"],
    ["workers", `ortho-staging-pass-4474257830-worker`, "another, shorter run: a string prefix of this one's"],
    ["workers", `ortho-staging-pass-447425783030-worker`, "another, longer run that starts with this one's id"],
    ["workers", `my-${P}-app`, "carries the prefix in the middle: the spike's `includes` called it ours"],
    ["d1", `ortho-staging-pass-44742578304-db`, "the next run's database"],
    ["durable-object-namespaces", `someone-else:Thing:${P}_Thing`, "a namespace whose own name carries the prefix but whose script is another's"],
    ["durable-object-namespaces", `ortho-staging-pass-4474257830-worker:World:ortho-staging-pass-4474257830-worker_World`, "another run's World"],
  ];
  for (const [label, name, why] of lookalikes) {
    test(`${label} ${name} (${why}) is not the run's`, () => {
      const v = leftovers(plus(clean(), label, name), P);
      assert.equal(v.exit, 0, lines(v));
      assert.deepEqual(v.left, []);
    });
  }

  test("all the lookalikes at once, in an account that also holds the run's one real leftover: only the real one is named", () => {
    let listing = clean();
    for (const [label, name] of lookalikes) listing = plus(listing, label, name);
    listing = plus(listing, "d1", `${P}-db`);
    assert.deepEqual(leftovers(listing, P).left, [{ label: "d1", name: `${P}-db` }]);
  });

  test("a run owns its own names and not a longer run's", () => {
    assert.equal(owns("ortho-a-stg-1", "ortho-a-stg-1-worker"), true);
    assert.equal(owns("ortho-a-stg-1", "ortho-a-stg-1"), true);
    assert.equal(owns("ortho-a-stg-1", "ortho-a-stg-12-worker"), false);
    assert.equal(owns("ortho-a-stg-12", "ortho-a-stg-1-worker"), false);
    assert.equal(owns("ortho-a-stg-1", undefined), false);
  });
});

describe("leftovers: a listing that cannot be read never reads as clean", () => {
  const unreadable = (listing, prefix = P) => {
    const v = leftovers(listing, prefix);
    assert.equal(v.exit, 2, lines(v));
    assert.match(lines(v), /UNREADABLE|not a run's prefix/);
  };
  test("one kind refused (an error entry, however the rest looks)", () => unreadable(clean().map((e) => (e.label === "r2" ? { label: "r2", error: "HTTP 403 [{\"code\":10000}]" } : e))));
  test("each kind in turn refused", () => { for (const kind of KINDS) unreadable(clean().map((e) => (e.label === kind ? { label: kind, error: "HTTP 500" } : e))); });
  test("a kind never listed, each in turn (a lister that skipped R2 would otherwise pass)", () => { for (const kind of KINDS) unreadable(clean().filter((e) => e.label !== kind)); });
  test("a kind listed twice", () => unreadable([...clean(), clean()[0]]));
  test("a kind nobody asked for", () => unreadable([...clean(), { label: "queues", names: [] }]));
  test("names that are not a list, or not strings", () => {
    unreadable(clean().map((e) => (e.label === "d1" ? { label: "d1", names: "none" } : e)));
    unreadable(clean().map((e) => (e.label === "d1" ? { label: "d1", names: [null] } : e)));
    unreadable(clean().map((e) => (e.label === "d1" ? { label: "d1" } : e)));
  });
  test("a name listed twice in a kind (an API that repeats itself)", () => {
    unreadable(plus(clean(), "workers", "same", "same"));
    assert.equal(leftovers(plus(clean(), "r2", `${P}-bucket`, `${P}-bucket`), P).exit, 1);
  });
  test("a namespace entry that is not script:class:name: two parts, four parts, an empty part", () => {
    for (const bad of ["someone:World", "someone:World:a:b", "someone::x", ":World:x"]) unreadable(plus(clean(), "durable-object-namespaces", bad));
  });
  test("an empty listing, null, an object, nothing", () => { unreadable([]); unreadable(null); unreadable({}); unreadable(undefined); });
  test("a prefix that would claim what is not the run's: empty, short, upper-case, a bare run id, with a trailing dash", () => {
    for (const bad of ["", "ortho", "ortho-x", "ORTHO-A-STG-1", "44742578303", `${P}-`, `${P}-db`]) unreadable(clean(), bad);
    assert.equal(leftovers(clean(), undefined).exit, 2);
  });
  test("an account with nothing in it, all four kinds read, is clean", () => assert.equal(leftovers(KINDS.map((label) => ({ label, names: [] })), P).exit, 0));
  test("read says what is wrong and what is there", () => {
    assert.equal(read(clean()).problems.length, 0);
    assert.equal(read(clean()).by.get("d1").length, 0);
  });
});

describe("untouched: nothing without the prefix changed between before up and after destroy", () => {
  const before = () => plus(clean(), "d1", "unrelated-db");
  const after = () => plus(clean(), "d1", "unrelated-db");
  test("the same account, the run's own resources made and gone between: passes", () => {
    const v = untouched(before(), after(), P);
    assert.equal(v.exit, 0, lines(v));
  });
  test("the run's resources present in `before` (a re-run of the same id) and gone after are not a change", () => {
    assert.equal(untouched(plus(up(), "d1", "unrelated-db"), after(), P).exit, 0);
  });
  for (const label of KINDS) {
    test(`an unrelated ${label} entry gone after destroy: fails, REMOVED, naming it`, () => {
      const gone = before().find((e) => e.label === label).names[0];
      const v = untouched(before(), minus(after(), label, gone), P);
      assert.equal(v.exit, 1);
      assert.match(lines(v), new RegExp(`REMOVED ${label}: ${gone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    });
    test(`an unrelated ${label} entry that was not there before: fails, APPEARED`, () => {
      const added = label === "durable-object-namespaces" ? "someone:Thing:someone_Thing" : "someone-elses-new-thing";
      const v = untouched(before(), plus(after(), label, added), P);
      assert.equal(v.exit, 1);
      assert.match(lines(v), new RegExp(`APPEARED ${label}: ${added}`));
    });
  }
  test("a lookalike of the run's name that destroy removed (the next run's, a longer id) fails: it was never the run's", () => {
    const withLook = plus(before(), "workers", `${P}0-worker`);
    const v = untouched(withLook, after(), P);
    assert.equal(v.exit, 1);
    assert.match(lines(v), /REMOVED workers: .*0-worker/);
  });
  test("a duplicate in either listing is not a clean pass (the account lists a name once)", () => {
    assert.equal(untouched(plus(before(), "workers", "other", "other"), plus(after(), "workers", "other"), P).exit, 2);
    assert.equal(untouched(plus(before(), "workers", "other"), plus(after(), "workers", "other", "other"), P).exit, 2);
  });
  test("a resource moved between kinds (a worker gone, a bucket of the same name appeared) is two changes", () => {
    const v = untouched(plus(before(), "workers", "shared-name"), plus(after(), "r2", "shared-name"), P);
    assert.equal(v.exit, 1);
    assert.match(lines(v), /REMOVED workers: shared-name/);
    assert.match(lines(v), /APPEARED r2: shared-name/);
  });
  test("an unreadable before, or an unreadable after, cannot say nothing changed (2), and a bad prefix too", () => {
    assert.equal(untouched(before().filter((e) => e.label !== "r2"), after(), P).exit, 2);
    assert.equal(untouched(before(), after().map((e) => (e.label === "d1" ? { label: "d1", error: "HTTP 500" } : e)), P).exit, 2);
    assert.equal(untouched(before(), after(), "").exit, 2);
  });
  test("worst: a failure beats an unreadable listing beats a pass", () => {
    assert.equal(worst([{ exit: 0 }, { exit: 2 }, { exit: 1 }]), 1);
    assert.equal(worst([{ exit: 0 }, { exit: 2 }]), 2);
    assert.equal(worst([{ exit: 0 }]), 0);
  });
});

describe("made: while up, the run's resources are the plan's, no more and no fewer", () => {
  const Q = "ortho-pluggedin-stg-44742578303";
  const plan = (...extra) => ({
    app: "plugged-in", environment: "staging", run: "44742578303", prefix: Q,
    resources: [{ kind: "worker", name: `${Q}-worker` }, { kind: "d1", name: `${Q}-db`, binding: "DB" }, { kind: "durable-object-namespace", script: `${Q}-worker`, class: "World" }, ...extra],
  });
  const during = () => plus(plus(plus(clean(), "workers", `${Q}-worker`), "d1", `${Q}-db`), "durable-object-namespaces", `${Q}-worker:World:${Q}-worker_World`);
  test("exactly the plan: passes (a namespace's own name is the API's)", () => assert.equal(made(plan(), during(), Q).exit, 0));
  test("a planned resource not made, each kind in turn: fails, NOT MADE", () => {
    for (const [label, name] of [["workers", `${Q}-worker`], ["d1", `${Q}-db`], ["durable-object-namespaces", `${Q}-worker:World:${Q}-worker_World`]]) {
      const v = made(plan(), minus(during(), label, name), Q);
      assert.equal(v.exit, 1);
      assert.match(lines(v), /NOT MADE/);
    }
  });
  test("a resource of the run's that the plan did not say, each kind in turn: fails, NOT PLANNED", () => {
    for (const [label, name] of [["workers", `${Q}-sink`], ["d1", `${Q}-db-ledger`], ["durable-object-namespaces", `${Q}-worker:Actor:${Q}-worker_Actor`], ["r2", `${Q}-bucket`]]) {
      const v = made(plan(), plus(during(), label, name), Q);
      assert.equal(v.exit, 1, label);
      assert.match(lines(v), /NOT PLANNED/);
    }
  });
  test("two namespaces of one class where the plan says one: NOT PLANNED (the plan was counted, not looked up)", () => {
    const v = made(plan(), plus(during(), "durable-object-namespaces", `${Q}-worker:World:${Q}-worker_World2`), Q);
    assert.equal(v.exit, 1);
    assert.match(lines(v), /NOT PLANNED durable-object-namespaces/);
  });
  test("a plan that cannot be read cannot be matched: no resources, none at all, a resource listed twice, an unknown kind, a class with colons, a prototype key", () => {
    const twice = plan({ kind: "worker", name: `${Q}-worker` });
    for (const bad of [{ prefix: Q }, { prefix: Q, resources: [] }, { prefix: Q, resources: "worker" }, twice,
      plan({ kind: "queue", name: `${Q}-q` }), plan({ kind: "__proto__", name: "x" }), plan({ kind: "toString", name: "x" }), plan({ kind: "durable-object-namespace", script: `${Q}-worker`, class: "World:i1" }),
      plan({ kind: "worker" }), plan("worker")]) {
      assert.equal(made(bad, during(), Q).exit, 2, JSON.stringify(bad).slice(0, 80));
    }
  });
  test("a namespace entry with extra parts is not read as the plan's class", () => {
    assert.equal(made(plan(), plus(minus(during(), "durable-object-namespaces", `${Q}-worker:World:${Q}-worker_World`), "durable-object-namespaces", `${Q}-worker:World:x:y`), Q).exit, 2);
    assert.equal(made(plan(), plus(minus(during(), "durable-object-namespaces", `${Q}-worker:World:${Q}-worker_World`), "durable-object-namespaces", `${Q}-worker:World`), Q).exit, 2);
  });
  test("a plan that names a namespace class the account does not have: NOT MADE", () => assert.equal(made(plan({ kind: "durable-object-namespace", script: `${Q}-worker`, class: "Actor" }), during(), Q).exit, 1));
  test("a plan for another run's prefix cannot be judged (2), nor an unreadable listing", () => {
    assert.equal(made({ ...plan(), prefix: "ortho-pluggedin-stg-1" }, during(), Q).exit, 2);
    assert.equal(made(plan(), during().filter((e) => e.label !== "r2"), Q).exit, 2);
  });
  test("another run's resources in the account are not this plan's to explain", () => {
    assert.equal(made(plan(), plus(during(), "workers", "ortho-pluggedin-stg-44742578304-worker"), Q).exit, 0);
  });
});

describe("the command: judge reads listings from files and exits as it judges", () => {
  const dir = mkdtempSync(join(tmpdir(), "staging-judge-"));
  const file = (name, value) => { const path = join(dir, name); writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value)); return path; };
  const run = (...args) => spawnSync(process.execPath, [join(here, "leftovers.mjs"), "judge", ...args], { encoding: "utf8" });
  test("clean listings: exit 0, STAGING CLEAN", () => {
    const r = run("--prefix", P, "--before", file("b.json", clean()), "--after", file("a.json", clean()));
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /STAGING CLEAN/);
  });
  test("a leftover: exit 1, the resource named, STAGING FAILED", () => {
    const r = run("--prefix", P, "--after", file("l.json", plus(clean(), "r2", `${P}-bucket`)));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /LEFTOVER r2: .*-bucket/);
    assert.match(r.stdout, /STAGING FAILED/);
  });
  test("an unrelated resource removed: exit 1 although nothing of the run's is left", () => {
    const r = run("--prefix", P, "--before", file("b2.json", clean()), "--after", file("a2.json", minus(clean(), "workers", clean()[0].names[0])));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /REMOVED workers/);
  });
  test("during and plan together: up made what the plan said, or it fails", () => {
    const Q = "ortho-pluggedin-stg-5";
    const plan = { prefix: Q, resources: [{ kind: "worker", name: `${Q}-worker` }] };
    const ok = run("--prefix", Q, "--after", file("a3.json", clean()), "--during", file("d3.json", plus(clean(), "workers", `${Q}-worker`)), "--plan", file("p3.json", plan));
    assert.equal(ok.status, 0, ok.stdout);
    const bad = run("--prefix", Q, "--after", file("a3.json", clean()), "--during", file("d4.json", clean()), "--plan", file("p3.json", plan));
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /NOT MADE/);
  });
  test("what it cannot read is exit 2: a missing file, text that is not JSON, one of --during and --plan, no prefix, an odd flag", () => {
    assert.equal(run("--prefix", P, "--after", join(dir, "nope.json")).status, 2);
    assert.equal(run("--prefix", P, "--after", file("x.json", "not json")).status, 2);
    assert.equal(run("--prefix", P, "--after", file("a5.json", clean()), "--during", file("d5.json", clean())).status, 2);
    assert.equal(run("--after", file("a6.json", clean())).status, 2);
    assert.equal(run("--prefix", P, "--after").status, 2);
    assert.equal(run("--prefix", P, "after", file("a7.json", clean())).status, 2);
  });
  test("exit status is the verdict's even with all three judgements: a leftover beats an unreadable before", () => {
    const r = run("--prefix", P, "--before", file("b8.json", []), "--after", file("a8.json", plus(clean(), "d1", `${P}-db`)));
    assert.equal(r.status, 1);
  });
  test("cleanup", () => rmSync(dir, { recursive: true, force: true }));
});

describe("snapshot: the lister reads a whole account, pages included, and never writes the credential down", () => {
  /** A fake account on this machine: `workers` is paged at 100 and has 150; R2 answers 403 when asked to. */
  const serve = (options = {}) => new Promise((resolve) => {
    const seen = [];
    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://x");
      seen.push({ path: url.pathname, page: url.searchParams.get("page"), auth: req.headers.authorization });
      const send = (status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
      const ok = (result) => send(200, { success: true, errors: [], result });
      const page = Number(url.searchParams.get("page"));
      if (url.pathname.endsWith("/workers/scripts")) return ok(Array.from({ length: 150 }, (_, i) => ({ id: `w${i}` })).slice((page - 1) * 100, page * 100));
      if (url.pathname.endsWith("/d1/database")) return ok(page === 1 ? [{ name: "db-one" }] : []);
      if (url.pathname.endsWith("/durable_objects/namespaces")) return ok(page === 1 ? [{ script: "s", class: "C", name: "s_C" }] : []);
      if (url.pathname.endsWith("/r2/buckets")) return options.refuseR2 ? send(403, { success: false, errors: [{ code: 10000, message: "Authentication error" }] }) : ok({ buckets: page === 1 ? [{ name: "bucket-one" }] : [] });
      return send(404, { success: false, errors: [] });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, seen, base: `http://127.0.0.1:${server.address().port}` }));
  });
  const snapshot = (env, out) => new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, "leftovers.mjs"), "snapshot", out], { env: { PATH: process.env.PATH, ...env } });
    let text = "";
    child.stdout.on("data", (d) => { text += d; });
    child.stderr.on("data", (d) => { text += d; });
    child.on("close", (status) => resolve({ status, text }));
  });
  const TOKEN = "canary-token-0f3a9c", ACCOUNT = "canary-account-77b1e2";
  const withServer = async (options, body) => {
    const fake = await serve(options);
    const dir = mkdtempSync(join(tmpdir(), "staging-snap-"));
    try { await body(fake, join(dir, "listing.json")); } finally { fake.server.close(); rmSync(dir, { recursive: true, force: true }); }
  };

  test("every kind, every page: 150 workers over two pages, and the listing is judgeable as it stands", async () => {
    await withServer({}, async (fake, out) => {
      const r = await snapshot({ CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, ORTHO_STAGING_API: fake.base }, out);
      assert.equal(r.status, 0, r.text);
      const listing = JSON.parse(readFileSync(out, "utf8"));
      assert.deepEqual(listing.map((e) => e.label), KINDS);
      assert.equal(listing[0].names.length, 150);
      assert.deepEqual(listing[1].names, ["db-one"]);
      assert.deepEqual(listing[2].names, ["s:C:s_C"]);
      assert.deepEqual(listing[3].names, ["bucket-one"]);
      assert.equal(leftovers(listing, "ortho-pluggedin-stg-1").exit, 0);
    });
  });
  test("the token is sent as the bearer and to the account's own path, and neither it nor the account id is printed or written", async () => {
    await withServer({}, async (fake, out) => {
      const r = await snapshot({ CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, ORTHO_STAGING_API: fake.base }, out);
      assert.ok(fake.seen.length >= 4 && fake.seen.every((s) => s.auth === `Bearer ${TOKEN}`));
      assert.ok(fake.seen.every((s) => s.path.startsWith(`/client/v4/accounts/${ACCOUNT}/`)));
      for (const text of [r.text, readFileSync(out, "utf8")]) { assert.ok(!text.includes(TOKEN)); assert.ok(!text.includes(ACCOUNT)); }
    });
  });
  test("a kind the token may not read is written as an error, never as an empty list, and the exit is 2", async () => {
    await withServer({ refuseR2: true }, async (fake, out) => {
      const r = await snapshot({ CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, ORTHO_STAGING_API: fake.base }, out);
      assert.equal(r.status, 2);
      const listing = JSON.parse(readFileSync(out, "utf8"));
      assert.match(listing.find((e) => e.label === "r2").error, /HTTP 403/);
      assert.equal(listing.find((e) => e.label === "r2").names, undefined);
      assert.equal(leftovers(listing, "ortho-pluggedin-stg-1").exit, 2);
      assert.ok(!r.text.includes(TOKEN));
    });
  });
  test("without both variables it exits 2 and reaches for no network; an override that is not this machine is refused before any request", async () => {
    await withServer({}, async (fake, out) => {
      assert.equal((await snapshot({ ORTHO_STAGING_API: fake.base }, out)).status, 2);
      assert.equal((await snapshot({ CLOUDFLARE_API_TOKEN: TOKEN, ORTHO_STAGING_API: fake.base }, out)).status, 2);
      assert.equal((await snapshot({ CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, ORTHO_STAGING_API: "https://api.example.com" }, out)).status, 2);
      assert.equal(fake.seen.length, 0);
    });
  });
});
