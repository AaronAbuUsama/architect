"""Writes data.js: acme's real generated/portal/blueprint.json (the generator's input for the site), read from git.

Usage: python3 data.py [REV]   (default origin/layer/3). The evidence is not here: see evidence.js, an illustration.
"""
import json, subprocess, sys

REV = sys.argv[1] if len(sys.argv) > 1 else "origin/layer/3"
PATH = "examples/acme/generated/portal/blueprint.json"
sha = subprocess.check_output(["git", "rev-parse", REV], text=True).strip()
blueprint = json.loads(subprocess.check_output(["git", "show", f"{sha}:{PATH}"], text=True))
with open("data.js", "w") as f:
    f.write(f"// Generated from {PATH} at {sha[:10]} by spikes/portal-docs/data.py. Do not edit.\n")
    f.write("const BP = " + json.dumps(blueprint, separators=(",", ":")) + ";\n")
print(f"data.js from {sha[:10]}: {len(blueprint['model']['things'])} things, {len(blueprint['model']['operations'])} operations, {len(blueprint['docs'])} docs")
