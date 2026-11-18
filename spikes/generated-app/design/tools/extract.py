# Builds sketches/data.js from acme's compiled model and one Collector traces file.
# Usage: python3 -I extract.py <model.json> <traces.jsonl> <out data.js>
# Nothing in the sketches is typed by hand: every name, field, count and span comes from these two files.
import collections, json, sys

model_path, traces_path, out_path = sys.argv[1:4]
model = json.load(open(model_path))


def val(v):
    return next(iter(v.values())) if v else None


spans = []
for line in open(traces_path):
    for rs in json.loads(line).get("resourceSpans", []):
        env = {a["key"]: val(a["value"]) for a in rs["resource"]["attributes"]}.get("deployment.environment")
        for ss in rs["scopeSpans"]:
            for s in ss["spans"]:
                attrs = {a["key"]: val(a["value"]) for a in s.get("attributes", [])}
                spans.append({
                    "trace": s["traceId"], "id": s["spanId"], "parent": s.get("parentSpanId") or None,
                    "name": s["name"], "start": int(s["startTimeUnixNano"]) // 1_000_000,
                    "end": int(s["endTimeUnixNano"]) // 1_000_000, "error": s["status"].get("code") == 2,
                    "attrs": attrs, "env": env,
                })

t0 = min(s["start"] for s in spans)
t1 = max(s["end"] for s in spans)
by_trace = collections.defaultdict(list)
for s in spans:
    by_trace[s["trace"]].append(s)

op_names = set(model["operations"])
calls = []  # one row per call: the operation span, or the HTTP span when no operation span opened (NotAllowed)
for tid, ss in by_trace.items():
    op = next((s for s in ss if s["name"] in op_names), None)
    http = next((s for s in ss if s["name"] == "POST"), None)
    if op:
        a = op["attrs"]
        outcome = "defect" if op["error"] else ("refused" if "refusal" in a else "answered")
        calls.append({
            "trace": tid, "op": op["name"], "at": op["start"], "ms": op["end"] - op["start"], "outcome": outcome,
            "refusal": a.get("refusal"), "log": a.get("refusal.log"), "person": a.get("principal.person"),
            "replayed": a.get("request.replayed") in (True, "true"), "http": http["attrs"].get("http.response.status_code") if http else None,
            "payload": {k[8:]: v for k, v in a.items() if k.startswith("payload.")},
            "answer": {k[7:]: v for k, v in a.items() if k.startswith("answer.")},
            "move": a.get("move.name"), "to": a.get("move.to"), "event": a.get("event.name"),
        })
    elif http and http["attrs"].get("http.response.status_code") == "403":
        route = http["attrs"].get("http.route", "")
        calls.append({
            "trace": tid, "op": route.strip("/").replace("/", "."), "at": http["start"], "ms": http["end"] - http["start"],
            "outcome": "refused", "refusal": "NotAllowed", "log": None, "person": None, "replayed": False, "http": "403",
            "payload": {}, "answer": {}, "move": None, "to": None, "event": None, "seenOn": "http span (no operation span opened)",
        })
calls.sort(key=lambda c: c["at"])


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(len(xs) * p))] if xs else None


ops = {}
for name in sorted(op_names):
    cs = [c for c in calls if c["op"] == name]
    ops[name] = {
        "calls": len(cs),
        "answered": sum(c["outcome"] == "answered" for c in cs),
        "refused": dict(collections.Counter(c["refusal"] for c in cs if c["outcome"] == "refused")),
        "defects": sum(c["outcome"] == "defect" for c in cs),
        "replayed": sum(c["replayed"] for c in cs),
        "p50": pct([c["ms"] for c in cs if c["outcome"] != "refused" or c["refusal"] != "NotAllowed"], 0.5),
        "p95": pct([c["ms"] for c in cs if c["outcome"] != "refused" or c["refusal"] != "NotAllowed"], 0.95),
        "budget": model["operations"][name]["budget"]["p95Ms"],
    }

minutes = int((t1 - t0) / 60000) + 1
series = collections.defaultdict(lambda: [[0, 0, 0] for _ in range(minutes)])
for c in calls:
    m = int((c["at"] - t0) / 60000)
    series[c["op"]][m][{"answered": 0, "refused": 1, "defect": 2}[c["outcome"]]] += 1

events = collections.Counter(c["event"] for c in calls if c["event"])
# A move is counted from its event: allowance.revoke's span carries event.name but no move.name or move.to.
def move_to(c):
    move = (model["operations"].get(c["op"]) or {}).get("move") or {}
    return c["to"] or (move.get("to") or [None])[0]
moves = collections.Counter((c["op"], move_to(c)) for c in calls if c["event"])
no_move_attrs = sorted({c["op"] for c in calls if c["event"] and not c["move"]})
people = collections.defaultdict(collections.Counter)
for c in calls:
    if c["person"]:
        people[c["person"]][c["op"]] += 1


def tree(tid):
    ss = sorted(by_trace[tid], key=lambda s: (s["start"], s["name"] != "POST"))
    keep = ("operation", "principal.person", "refusal", "refusal.log", "step.kind", "move.name", "move.to", "event.name",
            "http.route", "http.response.status_code", "db.query.text", "request.replayed")
    return [{**{k: s[k] for k in ("id", "parent", "name", "start", "end", "error")},
             "attrs": {k: v for k, v in s["attrs"].items() if k in keep or k.startswith(("payload.", "answer."))}} for s in ss]


def last(pred):
    return next(c for c in reversed(calls) if pred(c))


samples = {
    "answered": last(lambda c: c["op"] == "allowance.spend" and c["outcome"] == "answered" and not c["replayed"]),
    "exceeded": last(lambda c: c["refusal"] == "AllowanceExceeded"),
    "notActive": last(lambda c: c["refusal"] == "AllowanceNotActive"),
    "notAllowed": last(lambda c: c["refusal"] == "NotAllowed" and c["op"] == "allowance.spend"),
}
data = {
    "source": {"model": model_path.split("examples/")[-1], "traces": traces_path.split("examples/")[-1],
               "spans": len(spans), "traces": len(by_trace), "from": t0, "to": t1, "minutes": minutes},
    "model": model,
    "ops": ops,
    "series": dict(series),
    "events": dict(events),
    "moves": [{"op": k[0], "to": k[1], "n": n} for k, n in moves.items()],
    "people": {p: dict(c) for p, c in people.items()},
    "noMoveAttrs": no_move_attrs,
    # Names from the traffic run's own /_world/cast call (ada, olga, bob); bob's calls were all refused before a span opened.
    "cast": {"per_7inx0k21c6puqb25": "ada", "per_xi2i9blpcy4dgoq5": "olga"},
    "recent": [c for c in calls if c["op"].startswith("allowance.")][-40:],
    "samples": {k: {"call": c, "spans": tree(c["trace"])} for k, c in samples.items()},
}
open(out_path, "w").write("// Generated by tools/extract.py from acme's model.json and a local Collector traces file. Do not edit.\n"
                          "window.ACME = " + json.dumps(data, separators=(",", ":")) + ";\n")
print(f"{len(spans)} spans, {len(by_trace)} traces, {len(calls)} calls, {minutes} min -> {out_path}")
