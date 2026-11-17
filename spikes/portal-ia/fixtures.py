"""Build/check spikes/portal-ia/acme-data.js from acme at a pinned layer/3 revision. No server, no network.

Real, byte-for-data: generated/model/model.json, generated/model/edges.json, generated/docs/*.
Read from source (NOT in the generated model, labelled so on screen): journeys, starting worlds, handler files.
The journey/world parse below is a design stand-in for the projection F2 proposes; it is not a compiler.
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REVISION = "92bb0faa9529f1c81334650cff09670cf6e36d5a"  # origin/layer/3, 17 November 2026
ACME = "examples/acme"


def show(path):
    return subprocess.check_output(["git", "show", f"{REVISION}:{ACME}/{path}"], cwd=ROOT).decode()


def ls(path):
    out = subprocess.check_output(["git", "ls-tree", "--full-tree", "--name-only", REVISION, f"{ACME}/{path}/"], cwd=ROOT)
    return sorted(line.rsplit("/", 1)[-1] for line in out.decode().split())


def imports(src):
    """Map local identifiers to declaration names, from import lines."""
    found = {}
    for names, path in re.findall(r'import\s+(.+?)\s+from\s+"([^"]+)"', src):
        verb = re.search(r"things/([\w-]+)/verbs/([\w-]+)\.ts$", path)
        if verb and not names.startswith("{"):
            found[names.strip()] = f"{verb.group(1)}.{verb.group(2)}"
        roles = re.search(r"things/([\w-]+)/roles\.ts$", path)
        if roles:
            for n in re.findall(r"\w+", names):
                found[n] = f"{roles.group(1)}.{n}"
        machine = re.search(r"things/([\w-]+)/machine\.ts$", path)
        if machine:
            found["machine"] = machine.group(1)
    return found


def cast(src, names):
    block = re.search(r"cast:\s*\{([^}]*)\}", src)
    if not block:
        return {}
    out = {}
    for who, role in re.findall(r"(\w+):\s*([\w.]+)", block.group(1)):
        out[who] = names.get(role, role.replace("Blueprint.", ""))
    return out


def asserts(chunk, names):
    out = []
    for e in re.findall(r"emits\((\w+)", chunk):
        out.append({"kind": "emits", "event": e})
    for r in re.findall(r"refuses\(([\w.]+)", chunk):
        if r == "machine.notFrom":
            r = names.get("machine", "?") + ".notFrom"
        out.append({"kind": "refuses", "error": r.replace("Blueprint.", "")})
    for s in re.findall(r'machine\.isIn\([^,]+,\s*"(\w+)"', chunk):
        out.append({"kind": "is-in", "thing": names.get("machine"), "state": s})
    if "noEvents()" in chunk:
        out.append({"kind": "no-events"})
    if "expect(" in chunk:
        out.append({"kind": "expect"})
    if "spans(" in chunk:
        out.append({"kind": "spans"})
    return out


def journey(file, src):
    names = imports(src)
    title = re.search(r'Blueprint\.journey\("([^"]+)"', src).group(1)
    starts = re.search(r'starts:\s*"([\w-]+)"', src)
    steps = []
    parts = re.split(r's\.step\(\s*\n?\s*"', src)[1:]
    for part in parts:
        step_title = part.split('"', 1)[0]
        run = re.search(r"s\.(\w+)\.run\((\w+)", part)
        steps.append({
            "title": step_title,
            "actor": run.group(1) if run else None,
            "calls": names.get(run.group(2), run.group(2)) if run else None,
            "asserts": asserts(part, names),
        })
    line = src[: src.index("Blueprint.journey")].count("\n") + 1
    return {"name": title, "file": f"journeys/{file}", "line": line,
            "starts": starts.group(1) if starts else None, "cast": cast(src, names), "steps": steps}


def world(file, src):
    names = imports(src)
    name = re.search(r'Blueprint\.startingWorld\("([\w-]+)"', src).group(1)
    base = re.search(r'from:\s*"([\w-]+)"', src)
    doc = re.search(r"/\*\*\s*(.+?)\s*\*/", src, re.S)
    makes = [names.get(v, v) for v in re.findall(r"\.run\((\w+)", src)]
    gives = re.search(r"gives:.*?\(\{([^}]*)\}\)", src, re.S)
    return {"name": name, "file": f"blueprint/starting-worlds/{file}", "from": base.group(1) if base else None,
            "description": doc.group(1) if doc else None, "cast": cast(src, names), "makes": makes,
            "gives": re.findall(r"(\w+):", gives.group(1)) if gives else []}


def build():
    model_text = show("generated/model/model.json")
    data = {
        "revision": REVISION,
        "modelSha256": hashlib.sha256(model_text.encode()).hexdigest(),
        "model": json.loads(model_text),
        "edges": json.loads(show("generated/model/edges.json")),
        "docs": {f"{t}/{d}": show(f"generated/docs/{t}/{d}")
                 for t in ls("generated/docs") if not t.endswith(".md") for d in ls(f"generated/docs/{t}")},
        "source": {
            "note": "Read from acme source at the pinned revision; not in the generated model.",
            "journeys": [journey(f, show(f"journeys/{f}")) for f in ls("journeys") if f.endswith(".ts")],
            "worlds": [world(f, show(f"blueprint/starting-worlds/{f}")) for f in ls("blueprint/starting-worlds")],
            "handlers": [f"src/{t}/{f}" for t in ls("src") for f in ls(f"src/{t}")],
        },
    }
    return ("// Generated from spikes/portal-ia/fixtures.py at " + REVISION[:7] + " (examples/acme). Do not edit.\n"
            "const ACME = " + json.dumps(data, separators=(",", ":"), sort_keys=True) + ";\n")


def main():
    script = build()
    target = ROOT / "acme-data.js"
    if "--check" in sys.argv:
        if target.read_text() != script:
            sys.exit("FAIL: acme-data.js differs from the pinned revision; rerun fixtures.py")
    else:
        target.write_text(script)
    print("PASS: acme-data.js matches examples/acme at " + REVISION[:7])


if __name__ == "__main__":
    main()
