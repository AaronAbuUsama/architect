"""Writes app/blueprint/acme.json: acme's real generated/portal/blueprint.json, the input a site generator gets.

Usage: python3 data.py [REV]   (default origin/layer/3). Run from spikes/portal-fumadocs.
"""
import json, subprocess, sys

REV = sys.argv[1] if len(sys.argv) > 1 else "origin/layer/3"
PATH = "examples/acme/generated/portal/blueprint.json"
sha = subprocess.check_output(["git", "rev-parse", REV], text=True).strip()
blueprint = json.loads(subprocess.check_output(["git", "show", f"{sha}:{PATH}"], text=True))
blueprint["_source"] = f"{PATH} at {sha[:10]}"
with open("app/blueprint/acme.json", "w") as f:
    json.dump(blueprint, f, indent=1)
print(f"acme.json from {sha[:10]}")
