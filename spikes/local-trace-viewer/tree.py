#!/usr/bin/env python3
"""Print a Tempo trace (the viewer's own API answer, OTLP JSON) as a tree, and say which spans have linked logs.

usage: tree.py trace.json [logs.json]
"""
import json
import sys

import base64

trace = json.load(open(sys.argv[1]))


def hexid(v):
    """Tempo's /api/traces answers with base64 ids; Loki labels carry hex."""
    if not v:
        return ""
    return v if all(c in "0123456789abcdef" for c in v) and len(v) in (16, 32) else base64.b64decode(v).hex()


for b in trace["batches"]:
    for ss in b["scopeSpans"]:
        for s in ss["spans"]:
            s["spanId"], s["parentSpanId"] = hexid(s["spanId"]), hexid(s.get("parentSpanId", ""))
spans = [s for b in trace["batches"] for ss in b["scopeSpans"] for s in ss["spans"]]
by_id = {s["spanId"]: s for s in spans}
kids = {}
for s in spans:
    kids.setdefault(s.get("parentSpanId", ""), []).append(s)


def attrs(s):
    return {a["key"]: list(a["value"].values())[0] for a in s.get("attributes", [])}


logs_by_span = {}
if len(sys.argv) > 2:
    for r in json.load(open(sys.argv[2]))["data"]["result"]:
        logs_by_span.setdefault(r["stream"]["span_id"], []).append(r["values"][0][1])

SHOW = ("step.", "payload.", "move.", "refusal", "operation", "principal", "answer.limit", "answer.state")


def show(parent, depth):
    for s in sorted(kids.get(parent, []), key=lambda x: int(x["startTimeUnixNano"])):
        ms = (int(s["endTimeUnixNano"]) - int(s["startTimeUnixNano"])) / 1e6
        keep = {k: v for k, v in attrs(s).items() if k.startswith(SHOW)}
        print(f"{'  ' * depth}{s['name']}  {ms:.1f} ms  {keep or ''}")
        for line in logs_by_span.get(s["spanId"], []):
            print(f"{'  ' * depth}  log: {line}")
        show(s["spanId"], depth + 1)


roots = [s for s in spans if s.get("parentSpanId", "") not in by_id]
print(f"{len(spans)} spans, {len(roots)} root(s)")
show(roots[0].get("parentSpanId", ""), 0)
